cmake_minimum_required(VERSION 2.8)

##############################################################################
# Setup project informations:
project( GrAFd )
set(GRAFD_BRIEF "The Graphic Automation Framework deamon")

set(GRAFD_MAJOR_VERSION 0)
set(GRAFD_MINOR_VERSION 0)
set(GRAFD_PATCH_VERSION 1)
set(GRAFD_VERSION
  ${GRAFD_MAJOR_VERSION}.${GRAFD_MINOR_VERSION}.${GRAFD_PATCH_VERSION})
SET( PROJECT_NAME ${CMAKE_PROJECT_NAME} )

##############################################################################
# Setup project dependencies:

FIND_PACKAGE(Boost COMPONENTS REQUIRED filesystem system)
IF (Boost_FOUND)
  #INCLUDE_DIRECTORIES(${INCLUDE_DIRECTORIES} ${Boost_INCLUDE_DIRS})
  INCLUDE_DIRECTORIES(${Boost_INCLUDE_DIRS})
  LINK_DIRECTORIES(${LINK_DIRECTORIES} ${Boost_LIBRARY_DIRS})
  ADD_DEFINITIONS( "-DHAS_BOOST" )
ENDIF()

find_library(
  ZEROMQ_LIBRARY
  NAMES libzmq zmq
)
SET(ZEROMQ_LIBRARIES "${ZEROMQ_LIBRARY}") 
MESSAGE(STATUS "Found zeromq (lib) in: ${ZEROMQ_LIBRARY}")

message( "Building type: ${CMAKE_BUILD_TYPE}" )

file(GLOB_RECURSE GrAFd_sources src/*.hpp src/*.cpp)
#add_executable( GrAFd src/logicengine.cpp src/connectors/connector.cpp src/connectors/connector4knx.cpp src/message.cpp src/confighandler.cpp src/main.cpp )
#add_executable( GrAFd src/logicengine.cpp src/main.cpp )
add_executable( GrAFd ${GrAFd_sources} )

TARGET_LINK_LIBRARIES( GrAFd ${Boost_LIBRARIES} ${ZEROMQ_LIBRARIES} )

configure_file( config.h.in "${CMAKE_CURRENT_BINARY_DIR}/config.h" @ONLY )
include_directories(${CMAKE_CURRENT_BINARY_DIR} ${CMAKE_CURRENT_SOURCE_DIR}/../logicd/include)

#set(CMAKE_CXX_FLAGS "-std=c++0x -O2 -Wall -Wextra -pedantic")
set(CMAKE_CXX_FLAGS "-std=c++0x -Wall -Wextra  -pedantic -fno-rtti -fstrict-enums -Wnoexcept -Wold-style-cast")
### leave out "-Weffc++" untill I find my copy of the book again...
### -Wshadow causes problems with Boost::Graph...

#
#set(CMAKE_CXX_FLAGS "-O2 -Wa,-a,-ad")
#set(CMAKE_CXX_FLAGS "-O2 -Wa,-alhn")
#set(CMAKE_CXX_FLAGS "-S")

##############################################################################
# Setup Doxygen
find_package(Doxygen)
if(DOXYGEN_FOUND)
  configure_file(${CMAKE_CURRENT_SOURCE_DIR}/Doxyfile.in ${CMAKE_CURRENT_BINARY_DIR}/Doxyfile @ONLY)
  add_custom_target(doc #ALL
    ${DOXYGEN_EXECUTABLE} ${CMAKE_CURRENT_BINARY_DIR}/Doxyfile
    WORKING_DIRECTORY ${CMAKE_CURRENT_SOURCE_DIR}
    COMMENT "Generating documentation with Doxygen" VERBATIM
  )
endif(DOXYGEN_FOUND)

add_subdirectory(src)
add_subdirectory(test)
add_subdirectory(lib)