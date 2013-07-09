
#ifndef GEOCODER_HASH_HPP
#deifne GEOCODER_HASH_HPP


namespace geocoder {

unsigned int hash (std::string const& str)
{
    unsigned int h = offset;
    for(int i = 0; i < str.size(); ++i)
    {
        h = h * prime;
        h = h ^ str[i];
    }
    return h;
}

/*

Good initial parameters:

For 32-bit: offset = 2166136261, prime = 16777619.
For 64-bit: offset = 14695981039346656037, prime 1099511628211


*/

#endif // GEOCODER_HASH_HPP
