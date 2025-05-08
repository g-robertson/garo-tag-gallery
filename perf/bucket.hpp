#pragma once

template <class T, class TContainer>
class Bucket {
    public:
        Bucket(std::filesystem::path bucketPath, std::size_t size)
        : mainFileName(bucketPath / "bucket.tbd"), toggleFileName(bucketPath / "bucket.ta"), startingSize_(size)
        {}
        
        std::size_t size() {
            return contents.size();
        }

        void insertItem(T item) {
            init();
        
            if (contents.insert(item).second) {
                contentsIsDirty = true;
                util::toggle(toggleContents, item);
                toggleContentsIsDirty = true;
            }
            
        }

        void toggleItem(T item) {
            init();

            util::toggle(contents, item);
            contentsIsDirty = true;
            util::toggle(toggleContents, item);
            toggleContentsIsDirty = true;
        }

        void deleteItem(T item) {
            init();
        
            if (contents.erase(item) == 1) {
                contentsIsDirty = true;
                util::toggle(toggleContents, item);
                toggleContentsIsDirty = true;
            }
        }

        void toggleAhead() {
            if (!toggleContentsIsDirty) {
                return;
            }
            
            if (contents.size() == startingSize_) {
                util::toggle(contents, FAKER());
                util::toggle(toggleContents, FAKER());
            }
        
            util::writeFile(toggleFileName, serialize(toggleContents));
            toggleContentsIsDirty = false;
        }

        void write() {
            if (!contentsIsDirty) {
                return;
            }
        
            util::writeFile(mainFileName, serialize(contents));
            startingSize_ = contents.size();
            toggleContents.clear();
            toggleContentsIsDirty = false;
            contentsIsDirty = false;
        }

        void close() {
            write();
        }

    private:
        static void insertContentsFn(Bucket& bucket, T item) {
            bucket.contents.insert(item);
        }
        static void toggleContentsFn(Bucket& bucket, T item) {
            util::toggle(bucket.contents, item);
        }

    protected:
    
        std::filesystem::path mainFileName;
        bool mainDirty = false;
        std::filesystem::path toggleFileName;
        bool toggleDirty = false;
        bool isRead = false;
        std::size_t startingSize_;
        TContainer contents;
        bool contentsIsDirty = false;
        TContainer toggleContents;
        bool toggleContentsIsDirty = false;

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
                // do nothing, file not opening is fine, is indicative of only toggle file
            }
            deserialize(mainContents, insertContentsFn);
        
            if (contents.size() == startingSize_) {
                return;
            }

            std::string toggleContentsStr = util::readFile(toggleFileName);
            deserialize(toggleContentsStr, toggleContentsFn);
        
            if (contents.size() != startingSize_) {
                // TODO: allow user intervention while showing both before and after toggles, 
                throw std::logic_error(std::string("With toggle contents included, contents size is still not the same as expected, something unforgiveable must have happened. This should never occur"));
            }
        
            // if toggle contents were needed, then we need to write immediately to prevent overwriting toggles
            contentsIsDirty = true;
            write();
        }

        virtual T FAKER() = 0;
        virtual void deserialize(std::string_view str, void(*callback)(Bucket<T, TContainer>& bucket, T item)) = 0;
        virtual std::string serialize(const TContainer& contents) = 0;
};