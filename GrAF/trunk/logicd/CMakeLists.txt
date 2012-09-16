cmake_minimum_required(VERSION 2.8)

##############################################################################
# Setup project informations:
project( logicd )
set(LOGICD_BRIEF "The Logic Engine deamon")

set(LOGICD_MAJOR_VERSION 0)
set(LOGICD_MINOR_VERSION 0)
set(LOGICD_PATCH_VERSION 1)
set(LOGICD_VERSION
  ${LOGICD_MAJOR_VERSION}.${LOGICD_MINOR_VERSION}.${LOGICD_PATCH_VERSION})
SET( PROJECT_NAME ${CMAKE_PROJECT_NAME} )

##############################################################################
# Setup project dependencies:

FIND_PACKAGE(Boost COMPONENTS program_options REQUIRED)
IF (Boost_FOUND)
  #INCLUDE_DIRECTORIES(${INCLUDE_DIRECTORIES} ${Boost_INCLUDE_DIRS})
  INCLUDE_DIRECTORIES(${Boost_INCLUDE_DIRS})
  LINK_DIRECTORIES(${LINK_DIRECTORIES} ${Boost_LIBRARY_DIRS})
  ADD_DEFINITIONS( "-DHAS_BOOST" )
ENDIF()

message( "Building type: ${CMAKE_BUILD_TYPE}" )

set(CMAKE_CXX_FLAGS "-std=c++0x -Wall -Wextra -pedantic")

file(GLOB_RECURSE logicd_sources src/*.cpp)
#add_executable( logicd ${logicd_sources} )

add_executable( logicd src/main.cpp )
add_executable( client src/testclient.cpp )
add_executable( send2logic src/send2logic.cpp )
add_executable( logicspy src/logicspy.cpp )
add_executable( knx2logic src/knx2logic.cpp )

find_library( 
  ZEROMQ_LIBRARY
  NAMES libzmq zmq 
)
SET(ZEROMQ_LIBRARIES "${ZEROMQ_LIBRARY}") 
MESSAGE(STATUS "Found zeromq (lib) in: ${ZEROMQ_LIBRARY}")

TARGET_LINK_LIBRARIES( logicd ${ZEROMQ_LIBRARIES} )
TARGET_LINK_LIBRARIES( client ${ZEROMQ_LIBRARIES} )
TARGET_LINK_LIBRARIES( send2logic ${ZEROMQ_LIBRARIES} )
TARGET_LINK_LIBRARIES( logicspy ${ZEROMQ_LIBRARIES} )
TARGET_LINK_LIBRARIES( knx2logic ${ZEROMQ_LIBRARIES} eibclient )

include_directories(${CMAKE_CURRENT_BINARY_DIR} ${CMAKE_CURRENT_SOURCE_DIR}/include)

add_subdirectory(src)
add_subdirectory(include)