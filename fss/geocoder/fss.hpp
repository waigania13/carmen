//

#ifndef GEOCODER_FSS_HPP
#define GEOCODER_FSS_HPP

// stl
#include <string>
#include <vector>
#include <forward_list>
#include <set>
#include <functional>
#include <unordered_map>
#include <iostream>
// boost
#include <boost/regex/pending/unicode_iterator.hpp>

// default distance
#include "levenshtein.hpp"

namespace geocoder {

template <typename T>
std::vector<T> d_neighborhood( T const& str, int distance)
{
    typedef T string_type;

    std::vector<string_type> output;
    output.push_back(str);
    if (distance == 0)
    {
        return output;
    }

    std::size_t size = str.length();
    for (std::size_t i = 0; i < size; ++i)
    {
        T s(str);
        s.erase(i,1);
        std::vector<string_type> n = d_neighborhood(s, distance - 1);
        output.insert( output.end(), n.begin(), n.end());
    }
    return output;
}

template <typename T0 = levenshtein_distance<std::u32string>,
          typename T1 = std::hash<std::u32string> >
class fss_engine
{
    struct sort_by_distance
    {
        bool operator() (std::pair<std::string, unsigned> const& a,
                         std::pair<std::string, unsigned> const& b) const
        {
            return a.second < b.second;
        }
    };

public:
    typedef T0 distance_type;
    typedef T1 hasher_type;
    typedef std::unordered_map<unsigned, std::forward_list<int32_t> > dictionary_type;
    typedef std::vector<std::string> base_dictionary_type;
    typedef std::vector<std::pair<std::string,unsigned> > result_type;

    fss_engine()
        : distance_(2) {}

    explicit fss_engine(unsigned distance)
        : distance_(distance) {}

    // non-copyable
    fss_engine(fss_engine const&) = delete;
    fss_engine& operator=(fss_engine const&) = delete;

    // modifiers
    void add(std::string const& word)
    {
        try
        {
            base_dict_.push_back(word); // push original (utf8 encoded) token
            std::size_t index = base_dict_.size() - 1;

            boost::u8_to_u32_iterator<std::string::const_iterator> begin(word.begin());
            boost::u8_to_u32_iterator<std::string::const_iterator> end(word.end());

            std::u32string wide_word(begin, end);

            if (wide_word.size() > min_length_)
            {
                std::vector<std::u32string> && neighbors = d_neighborhood(wide_word, distance_);
                for (auto && neighbor : neighbors)
                {
                    insert_residual_token(neighbor, index);
                }
            }
            else
            {
                insert_residual_token(wide_word, index);
            }
        }
        catch (...)
        {
            std::cerr << "Exception caught converting:" << word << std::endl;
        }
    }

    void remove(std::string word) = delete;
    // utils
    std::size_t base_size() const
    {
        return base_dict_.size();
    }

    std::size_t residual_size() const
    {
        return residual_dict_.size();
    }

    // search
    result_type search(std::string const& word, std::size_t distance, std::size_t num_results) const
    {
        // convert to wide string
        boost::u8_to_u32_iterator<std::string::const_iterator> begin(word.begin());
        boost::u8_to_u32_iterator<std::string::const_iterator> end(word.end());
        std::u32string wide_word(begin, end);
        // fetch candidates
        std::set<std::pair<std::string,unsigned> > candidates;
        for (auto && neighbor : d_neighborhood(wide_word, distance))
        {
            auto itr = residual_dict_.find(hasher_(neighbor));
            if (itr != residual_dict_.end())
            {
                for (auto && index : itr->second)
                {
                    if (index < base_dict_.size())
                    {
                        std::string const& candidate = base_dict_[index];
                        boost::u8_to_u32_iterator<std::string::const_iterator> begin(candidate.begin());
                        boost::u8_to_u32_iterator<std::string::const_iterator> end(candidate.end());
                        std::u32string wide_candidate(begin,end);
                        unsigned ed = distance_calc_(wide_candidate, wide_word);
                        if (ed <= distance_)
                        {
                            candidates.insert(std::make_pair(candidate,ed));
                        }
                    }
                }
            }
        }

        std::vector<std::pair<std::string,unsigned> > temp_result(candidates.begin(), candidates.end());
        std::sort(temp_result.begin(), temp_result.end(), sort_by_distance());
        auto && last = temp_result.begin();
        std::advance(last, std::min(num_results, temp_result.size()));
        return result_type(temp_result.begin(), last);
    }

private:

    void insert_residual_token(std::u32string const& token, std::size_t index)
    {
        unsigned hash = hasher_(token);
        auto itr = residual_dict_.find(hash);
        if (itr != residual_dict_.end())
        {
            itr->second.emplace_front(index);
        }
        else
        {
            std::forward_list<int> l;
            l.emplace_front(index);
            residual_dict_.emplace(hash, l);
        }
    }

private:
    const unsigned min_length_ = 2;
    const unsigned distance_;
    base_dictionary_type base_dict_;
    dictionary_type residual_dict_;
    hasher_type hasher_;
    distance_type distance_calc_;
};

}

#endif // GEOCODER_FSS_HPP
