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

#undef LIKELY
#undef UNLIKELY

#if defined(__GNUC__) && __GNUC__ >= 4
#define LIKELY(x)   (__builtin_expect((x), 1))
#define UNLIKELY(x) (__builtin_expect((x), 0))
#else
#define LIKELY(x)   (x)
#define UNLIKELY(x) (x)
#endif

namespace protobuf {

#define FORCEINLINE inline __attribute__((always_inline))
#define NOINLINE __attribute__((noinline))
#define PBF_INLINE FORCEINLINE

struct message {
    PBF_INLINE message(const char *data, uint32_t length);

    PBF_INLINE bool next();
    PBF_INLINE uint64_t varint();
    PBF_INLINE uint64_t varint2();
    PBF_INLINE int64_t svarint();
    PBF_INLINE std::string string();
    PBF_INLINE float float32();
    PBF_INLINE double float64();
    PBF_INLINE int64_t int64();
    PBF_INLINE bool boolean();
    PBF_INLINE void skip();
    PBF_INLINE void skipValue(uint32_t val);
    PBF_INLINE void skipBytes(uint32_t bytes);

    const char *data;
    const char *end;
    uint64_t value;
    uint32_t tag;
};

message::message(const char * _data, uint32_t length)
    : data(_data),
      end(data + length)
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
    int8_t byte = 0x80;
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

static const int8_t kMaxVarintLength64 = 10;

uint64_t message::varint2() {
  const int8_t* begin = reinterpret_cast<const int8_t*>(data);
  const int8_t* iend = reinterpret_cast<const int8_t*>(end);
  const int8_t* p = begin;
  uint64_t val = 0;

  if (LIKELY(iend - begin >= kMaxVarintLength64)) {  // fast path
    int64_t b;
    do {
      b = *p++; val  = (b & 0x7f)      ; if (b >= 0) break;
      b = *p++; val |= (b & 0x7f) <<  7; if (b >= 0) break;
      b = *p++; val |= (b & 0x7f) << 14; if (b >= 0) break;
      b = *p++; val |= (b & 0x7f) << 21; if (b >= 0) break;
      b = *p++; val |= (b & 0x7f) << 28; if (b >= 0) break;
      b = *p++; val |= (b & 0x7f) << 35; if (b >= 0) break;
      b = *p++; val |= (b & 0x7f) << 42; if (b >= 0) break;
      b = *p++; val |= (b & 0x7f) << 49; if (b >= 0) break;
      b = *p++; val |= (b & 0x7f) << 56; if (b >= 0) break;
      b = *p++; val |= (b & 0x7f) << 63; if (b >= 0) break;
      throw std::invalid_argument("Invalid varint value");  // too big
    } while (false);
  } else {
    int shift = 0;
    while (p != iend && *p < 0) {
      val |= static_cast<uint64_t>(*p++ & 0x7f) << shift;
      shift += 7;
    }
    if (p == iend) throw std::invalid_argument("Invalid varint value");
    val |= static_cast<uint64_t>(*p++) << shift;
  }
  data = reinterpret_cast<const char *>(p);
  return val;
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
