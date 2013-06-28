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

// default distance
#include "levenshtein_distance.hpp"

namespace geocoder {

template <typename T>
std::vector<T> d_neighborhood( T const& str, int distance)
{
    std::vector<std::string> output;
    output.push_back(str);
    if (distance == 0)
    {
        return output;
    }

    std::size_t size = str.length();
    for (std::size_t i = 0; i < size; ++i)
    {
        std::string s(str);
        s.erase(i,1);
        std::vector<std::string> n = d_neighborhood(s, distance - 1);
        output.insert( output.end(), n.begin(), n.end());
    }
    return output;
}

template <typename T0 = levenshtein_distance<std::string>,
          typename T1 = std::hash<std::string> >
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
    typedef std::unordered_map<unsigned, std::forward_list<int> > dictionary_type;
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
        base_dict_.push_back(word);
        std::size_t index = base_dict_.size() - 1;

        insert_residual_token(word, index);

        if (word.size() > min_length_)
        {
            std::vector<std::string> && neighbors = d_neighborhood(word, distance_);
            for (auto && neighbor : neighbors)
            {
                insert_residual_token(neighbor, index);
            }
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
        // fetch candidates
        std::set<std::pair<std::string,unsigned> > candidates;
        for (auto && neighbor : d_neighborhood(word, distance))
        {
            auto itr = residual_dict_.find(hasher_(neighbor));
            if (itr != residual_dict_.end())
            {
                for (auto && index : itr->second)
                {
                    if (index < base_dict_.size())
                    {
                        std::string const& candidate = base_dict_[index];
                        unsigned ed = distance_calc_(candidate, word);
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

    void insert_residual_token(std::string const& token, std::size_t index)
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
