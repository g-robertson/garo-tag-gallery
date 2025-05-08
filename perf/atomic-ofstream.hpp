#pragma once

#include <filesystem>
#include <fstream>

class AtomicOfstream {
    public:
        AtomicOfstream(const std::filesystem::path& path);
        ~AtomicOfstream();

        void close();

        template <class T>
        friend AtomicOfstream& operator<<(AtomicOfstream& out, const T& item) {
            out.ofstream_ << item;

            return out;
        }
    private:
        std::filesystem::path path_;
        std::filesystem::path tempPath_;
        std::ofstream ofstream_;

        bool isClosed_ = false;
};