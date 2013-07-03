// Damerau-Levenshtein distance

#include <map>
#include <boost/numeric/ublas/matrix.hpp>


namespace geocoder {

template <typename T>
struct damerau_levenshtein_distance
{
    typedef T string_type;
    typedef typename T::value_type char_type;

    int operator() (T const& s, T const& t) const
    {
        using namespace boost::numeric::ublas;

        // degenerate cases
        if (s == t) return 0;
        if (s.size() == 0) return t.size();
        if (t.size() == 0) return s.size();
        //
        matrix<std::size_t> score(s.size() + 2, t.size() + 2);
        std::size_t infinity = s.size() + t.size();
        score(0,0) = infinity;

        for (std::size_t i = 0; i <= s.size(); ++i)
        {
            score(i + 1,1) = i;
            score(i + 1,0) = infinity;
        }

        for (std::size_t j = 0; j <= t.size(); ++j)
        {
            score(1, j + 1) = j;
            score(0,j + 1) = infinity;
        }

        std::map<char_type, int> sd;

        for (auto letter : s + t)
        {
            if (sd.find(letter) == sd.end())
            {
                sd.insert(std::make_pair(letter,0));
            }
        }

        for (std::size_t i = 1; i <= s.size(); ++i)
        {
            int db = 0;
            for (std::size_t j = 1; j <= t.size(); ++j)
            {
                std::size_t i1 = sd[t[j-1]];
                std::size_t j1 = db;
                if (s[i-1] == t[j-1])
                {
                    score(i + 1,j + 1) = score(i,j);
                    db = j;
                }
                else
                {
                    score(i + 1,j + 1) = std::min(score(i,j), std::min(score(i+1,j), score(i,j + 1))) + 1;
                }
                score(i + 1,j + 1) = std::min(score(i + 1, j + 1), score(i1, j1) + (i - i1 - 1) + 1 + (j - j1 - 1));
            }
            sd[s[i - 1]] = i;
        }
        return score(s.size() + 1, t.size() + 1);
    }
};

}  // namespace geocoder
