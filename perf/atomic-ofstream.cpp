#include "atomic-ofstream.hpp"

AtomicOfstream::AtomicOfstream(const std::filesystem::path& path) {
    path_ = std::filesystem::absolute(path);
    std::filesystem::create_directories(path_.parent_path());
    tempPath_ = path_;
    tempPath_ += ".atomictemp";
    ofstream_.open(tempPath_);
}

AtomicOfstream::~AtomicOfstream() {
    if (!isClosed_) {
        close();
    }
}

void AtomicOfstream::close() {
    if (isClosed_) {
        throw std::logic_error(std::string("Already closed this atomic ofstream"));
    }

    ofstream_.close();
    isClosed_ = true;
    std::filesystem::rename(tempPath_, path_);
}