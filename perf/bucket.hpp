#pragma once

#include "util.hpp"

template <class T, class TMainContainer, class TDiffContainer>
class Bucket {
    public:
        Bucket(std::filesystem::path bucketPath, std::size_t size)
        : mainFileName(bucketPath / "bucket.tbd"), diffFileName(bucketPath / "bucket.ta"), startingSize_(size)
        {}
        
        virtual ~Bucket() = default;

        const TMainContainer& contents() {
            init();
            return contents_;
        }

        std::size_t size() const {
            if (isRead) {
                return contents_.size();
            } else {
                return startingSize_;
            }
        }

        const std::filesystem::path& mainFileLocation() const {
            return mainFileName;
        }

        void insertItem(T item) {
            init();
        
            auto insertReturn = contents_.insert(item);
            if (insertReturn.second) {
                contentsIsDirty = true;
                util::toggle(diffContents, item);
                diffContentsIsDirty = true;
            }
        }

        void toggleItem(T item) {
            init();

            auto toggleReturn = util::toggle(contents_, item);
            contentsIsDirty = true;
            util::toggle(diffContents, item);
            diffContentsIsDirty = true;
        }

        void deleteItem(T item) {
            init();
        
            auto eraseReturn = contents_.erase(item);
            if (isErased(eraseReturn)) {
                contentsIsDirty = true;
                util::toggle(diffContents, item);
                diffContentsIsDirty = true;
            }
        }

        bool contains(T item) {
            init();

            return contents_.contains(item);
        }

        void diffAhead() {
            if (!diffContentsIsDirty) {
                return;
            }
            
            if (contents_.size() == startingSize_) {
                util::toggle(contents_, FAKER());
                util::toggle(diffContents, FAKER());
                diffContentsIsDirty = true;
            }
        
            util::writeFile(diffFileName, serializeDiff(diffContents));
            diffContentsIsDirty = false;
        }

        void write() {
            if (!contentsIsDirty) {
                return;
            }
        
            util::writeFile(mainFileName, serialize(contents_));
            startingSize_ = contents_.size();
            diffContents.clear();
            diffContentsIsDirty = false;
            contentsIsDirty = false;
            postContentsMatchFile();
        }

        void purgeUnusedFiles() const {
            if (diffContents.empty()) {
                util::removeFile(diffFileName);
            }
        }

        void close() {
            write();
        }

    protected:
        std::filesystem::path mainFileName;
        bool mainDirty = false;
        std::filesystem::path diffFileName;
        bool diffDirty = false;
        bool isRead = false;
        std::size_t startingSize_;
        TMainContainer contents_;
        bool contentsIsDirty = false;
        TDiffContainer diffContents;
        bool diffContentsIsDirty = false;

        void init() {
            if (isRead) {
                return;
            }
        
            isRead = true;
        
            if (startingSize_ == 0) {
                return;
            }
        
            std::string mainContents;
            try {
                mainContents = util::readFile(mainFileName);
            } catch(std::logic_error& err) {
                // do nothing, file not opening is fine, is indicative of only diff file
            }
            contents_ = deserialize(mainContents);

            if (contents_.size() == startingSize_) {
                postContentsMatchFile();
                return;
            }

            applyDiff(deserializeDiff(util::readFile(diffFileName)));
            contentsIsDirty = true;
            if (contents_.size() != startingSize_) {
                // TODO: allow user intervention while showing both before and after diff, 
                throw std::logic_error(std::string(
                    "With diff contents included, contents size of ") + mainFileName.generic_string() + " ("
                    + std::to_string(contents_.size()) + ") is still not the same as expected starting size ("
                    + std::to_string(startingSize_) + "), something unforgiveable must have happened. This should never occur");
            }
        
            // if diff contents were needed, then we need to write immediately to prevent overwriting diffs
            write();
        }

        virtual T FAKER() const = 0;
        virtual TMainContainer deserialize(std::string_view str) const = 0;
        virtual TDiffContainer deserializeDiff(std::string_view str) const = 0;
        virtual std::string serialize(const TMainContainer& contents) const = 0;
        virtual std::string serializeDiff(const TDiffContainer& contents) const = 0;
        static bool defaultIsErased(std::size_t count) {
            return count == 1;
        }
        virtual bool isErased(const util::EraseReturnType<TMainContainer>& eraseReturn) const = 0;

        template <class InnerT, class InnerTMainContainer, class InnerTDiffContainer>
        static void defaultApplyDiff(Bucket<InnerT, InnerTMainContainer, InnerTDiffContainer>& bucket, const TDiffContainer& contents) {
            for (const auto& item : contents) {
                util::toggle(bucket.contents_, item);
            }
        }

        virtual void applyDiff(const TDiffContainer& diffContents) = 0;
        virtual void postContentsMatchFile() {}
};