// stl
#include <iostream>
#include <fstream>
#include <algorithm>
// boost
#include <boost/spirit/include/qi.hpp>
#include <boost/timer/timer.hpp>
#include <boost/tokenizer.hpp>
#include <boost/locale.hpp>
#include <boost/regex/pending/unicode_iterator.hpp>

// geocoder
#include "geocoder/fss.hpp"

int main(int argc, char** argv)
{
    if (argc != 3)
    {
        std::cerr << "Usage:" << argv[0] << " <path-to-dict> <distance>" << std::endl;
        return EXIT_FAILURE;
    }

    std::string dict_path(argv[1]);
    int distance = std::atoi(argv[2]);

    std::ifstream file(dict_path);

    if (!file)
    {
        std::cerr << "Can't open dictionary file" << std::endl;
        return EXIT_FAILURE;
    }

    boost::locale::generator gen;
    std::locale loc = gen("");
    std::locale::global(loc);
    std::cerr.imbue(loc);

    std::string line;
    uint64_t count = 0;

    std::set<std::u32string> temp_dict;

    while (std::getline(file, line))
    {
        ++count;
        if (count%1000 == 0)
        {
            std::cerr << "\rLoading " << count;
        }

        // normalize
        line = boost::locale::to_lower(line);
        boost::u8_to_u32_iterator<std::string::const_iterator> begin(line.begin());
        boost::u8_to_u32_iterator<std::string::const_iterator> end(line.end());

        std::vector<std::u32string> words;
        // extract tokens
        bool result = boost::spirit::qi::parse(begin, end,
                                               +(boost::spirit::standard_wide::char_ - boost::spirit::standard_wide::space)
                                               % +(boost::spirit::standard_wide::space | boost::spirit::qi::lit(L",")),
                                               temp_dict);

        if (!result)
        {
            std::cerr << "FAIL:" << line << std::endl;
        }
    }
    std::cerr << "\nINPUT SIZE=" << temp_dict.size() << std::endl;
    //
    geocoder::fss_engine<> dict;

    // populate fss dictionary
    count = 0;

    for (auto && word : temp_dict)
    {
        ++count;
        if (count%1000 == 0)
        {
            std::cerr << "\rCreating index " << count << "/" << temp_dict.size() << " " << int(100*(count/(float)temp_dict.size())) << "%";
        }
        boost::u32_to_u8_iterator<std::u32string::const_iterator> begin(word.begin());
        boost::u32_to_u8_iterator<std::u32string::const_iterator> end(word.end());
        dict.add(std::string(begin,end));
    }
    temp_dict.clear();

    std::cerr << std::endl;

    std::cerr << "BASE_DICT size=" << dict.base_size() << std::endl;
    std::cerr << "RESIDUAL_DICT size=" << dict.residual_size() << std::endl;

    unsigned k = 10;

    std::string query;


    while (true)
    {
        std::cerr << "Enter query:";
        std::getline (std::cin,query);
        if (query.size() > 0 )
        {
            // normalise query,  extract tokens
            query = boost::locale::to_lower(query);

            boost::u8_to_u32_iterator<std::string::const_iterator> begin(query.begin());
            boost::u8_to_u32_iterator<std::string::const_iterator> end(query.end());
            std::vector<std::u32string> tokens;
            // extract tokens
            bool result = boost::spirit::qi::parse(begin, end,
                                                   +(boost::spirit::standard_wide::char_ - boost::spirit::standard_wide::space)
                                                   % +(boost::spirit::standard_wide::space | boost::spirit::qi::lit(L",")),
                                                   tokens);

            if (!result)
            {
                std::cerr << "FAIL:" << query << std::endl;
            }
            std::cerr << "======= START RESULT=======" << std::endl;
            boost::timer::auto_cpu_timer t;

            for (auto token : tokens)
            {

                boost::u32_to_u8_iterator<std::u32string::const_iterator> begin(token.begin());
                boost::u32_to_u8_iterator<std::u32string::const_iterator> end(token.end());
                auto && r = dict.search(std::string(begin,end), distance, k);
                if (r.size() > 0)
                {
                    if (r.front().second == 0)
                    {
                        std::cerr <<  r.front().first << " [" <<  r.front().second << "] ";
                    }
                    else
                    {
                        std::for_each(r.begin(), r.end(), [] (std::pair<std::string,unsigned> const& p)
                                      { std::cerr << p.first << "[" << p.second << "] ";} );
                    }
                    std::cerr << "+ ";
                }
            }
            std::cerr << "\n======= END   RESULT=======" << std::endl;
            std::cerr << std::endl;
        }
    }
    return EXIT_SUCCESS;
}
