perftags:
	g++ -std=c++23 \
		main.cpp \
		util.cpp \
		atomic-ofstream.cpp \
		tag-file-maintainer.cpp \
		id-pair-container.cpp \
		set-evaluation.cpp \
		-o perftags

test:
	g++ -std=c++23 \
		-DTESTING_MODE=TRUE \
		main.cpp \
		util.cpp \
		atomic-ofstream.cpp \
		tag-file-maintainer.cpp \
		tests/test-tag-file-maintainer.cpp \
		id-pair-container.cpp \
		set-evaluation.cpp \
		-o perftags-test