perftags:
	g++ -std=c++23 \
		-Wall \
		-Wshadow \
		-Wno-unused-function \
		main.cpp \
		atomic-ofstream.cpp \
		tag-file-maintainer.cpp \
		id-pair-container.cpp \
		set-evaluation.cpp \
		../common/util.cpp \
		-o perftags

test:
	g++ -std=c++23 \
		-DTESTING_MODE=TRUE \
		-Wall \
		-Wshadow \
		-Wno-unused-function \
		main.cpp \
		atomic-ofstream.cpp \
		tag-file-maintainer.cpp \
		tests/test-tag-file-maintainer.cpp \
		id-pair-container.cpp \
		set-evaluation.cpp \
		../common/util.cpp \
		-o perftags-test