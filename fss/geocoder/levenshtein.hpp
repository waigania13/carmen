//

#ifndef GEOCODER_LEVENSHTEIN_DISTANCE_HPP
#define GEOCODER_LEVENSHTEIN_DISTANCE_HPP

namespace geocoder {

namespace detail {

template <typename T>
inline T minimum(T a, T b, T c)
{
    T m = a;
    if (m > b) m = b;
    if (m > c) m = c;
    return m;
}
}

template <typename T>
struct levenshtein_distance
{
    int operator() (T const& s, T const& t) const
    {
        // degenerate cases
        if (s == t) return 0;
        if (s.size() == 0) return t.size();
        if (t.size() == 0) return s.size();
        //
        std::vector<int> v0(t.size() + 1);
        std::vector<int> v1(t.size() + 1);

        for (int i = 0; i < v0.size(); ++i)
        {
            v0[i] = i;
        }

        for (int i = 0; i < s.size(); ++i)
        {
            v1[0] = i + 1;
            for (int j = 0; j < t.size(); ++j)
            {
                int cost = (s[i] == t[j]) ? 0 : 1;
                v1[j + 1] = detail::minimum(v1[j] + 1, v0[j + 1] + 1, v0[j] + cost);
            }
            for (int j = 0; j < v0.size(); ++j)
            {
                v0[j] = v1[j];
            }
        }
        return v1[t.size()];
    }

};

}

#endif // GEOCODER_LEVENSHTEIN_DISTANCE_HPP
