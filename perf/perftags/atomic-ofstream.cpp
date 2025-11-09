#include "atomic-ofstream.hpp"
#include <iostream>

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
    for (int i = 0; i < 10; ++i) {
        bool caught = false;
        try {
            std::filesystem::rename(tempPath_, path_);
        } catch (...) {
            caught = true;
        }
        if (!caught) {
            break;
        } else {
            std::cerr << "Caught filesystem exception while renaming " + tempPath_.generic_string() << " retrying attempt #" + std::to_string(i) << std::endl;
        }
    }
}