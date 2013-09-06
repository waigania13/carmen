#pragma once

/*
 * Some parts are from upb - a minimalist implementation of protocol buffers.
 *
 * Copyright (c) 2008-2011 Google Inc.  See LICENSE for details.
 * Author: Josh Haberman <jhaberman@gmail.com>
 */

#include <stdint.h>
#include <stdexcept>
#include <string>
#include <cassert>

namespace protobuf {

#define FORCEINLINE inline __attribute__((always_inline))
#define NOINLINE __attribute__((noinline))
#define PBF_INLINE FORCEINLINE

struct message {
	PBF_INLINE message(const unsigned char *data, uint32_t length);
	PBF_INLINE message(const char *data, uint32_t length);
	PBF_INLINE message(const std::string& buffer);

	PBF_INLINE bool next();
	PBF_INLINE uint64_t varint();
	PBF_INLINE int64_t svarint();
	PBF_INLINE std::string string();
	PBF_INLINE float float32();
	PBF_INLINE double float64();
	PBF_INLINE int64_t int64();
	PBF_INLINE bool boolean();
	PBF_INLINE void skip();
	PBF_INLINE void skipValue(uint32_t val);
	PBF_INLINE void skipBytes(uint32_t bytes);

	const uint8_t *data;
	const uint8_t *end;
	uint64_t value;
	uint32_t tag;
};

message::message(const unsigned char *data, uint32_t length)
	: data(data),
	  end(data + length)
{
}

message::message(const char *data, uint32_t length)
	: data((const unsigned char *)data),
	  end((const unsigned char *)data + length)
{
}

bool message::next()
{
	if (data < end) {
		value = varint();
		tag = value >> 3;
		return true;
	}
	return false;
}


uint64_t message::varint()
{
	uint8_t byte = 0x80;
	uint64_t result = 0;
	int bitpos;
	for (bitpos = 0; bitpos < 70 && (byte & 0x80); bitpos += 7) {
		if (data >= end) {
			throw std::runtime_error("unterminated varint, unexpected end of buffer");
		}
		result |= ((uint64_t)(byte = *data) & 0x7F) << bitpos;
		data++;
	}
	if (bitpos == 70 && (byte & 0x80)) {
		throw std::runtime_error("unterminated varint (too long)");
	}

	return result;
}

int64_t message::svarint()
{
	uint64_t n = varint();
	return (n >> 1) ^ -(int64_t)(n & 1);
}

std::string message::string()
{
	uint32_t bytes = varint();
	const char *string = (const char *)data;
	skipBytes(bytes);
	return std::string(string, bytes);
}

float message::float32()
{
	skipBytes(4);
	float result;
	memcpy(&result, data - 4, 4);
	return result;
}
double message::float64()
{
	skipBytes(8);
	double result;
	memcpy(&result, data - 8, 8);
	return result;
}

int64_t message::int64()
{
	return (int64_t)varint();
}

bool message::boolean()
{
	skipBytes(1);
	return *(bool *)(data - 1);
}

void message::skip()
{
	skipValue(value);
}

void message::skipValue(uint32_t val)
{
	switch (val & 0x7) {
		case 0: // varint
			varint();
			break;
		case 1: // 64 bit
			skipBytes(8);
			break;
		case 2: // string/message
			skipBytes(varint());
			break;
		case 5: // 32 bit
			skipBytes(4);
			break;
		default:
			char msg[80];
			snprintf(msg, 80, "cannot skip unknown type %d", val & 0x7);
			throw std::runtime_error(msg);
	}
}

void message::skipBytes(uint32_t bytes)
{
	data += bytes;
	if (data > end) {
		throw std::runtime_error("unexpected end of buffer");
	}
}

}
