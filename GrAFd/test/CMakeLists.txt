include(CTest)

find_package(Boost COMPONENTS unit_test_framework REQUIRED)

include_directories(../src /usr/local/include)

add_executable( GrAFd_test logicengine_test.cpp ../src/logicengine.cpp ../src/logger.cpp ../src/messageregister.cpp )

TARGET_LINK_LIBRARIES( GrAFd_test  ${LIBS} ${Boost_LIBRARIES} boost_unit_test_framework ${ZEROMQ_LIBRARIES} )

# Boost test needs the RTTI...
STRING(REPLACE "-fno-rtti" "" CMAKE_CXX_FLAGS ${CMAKE_CXX_FLAGS})

# Setup testing
ENABLE_TESTING()
ADD_TEST(LogicEngine ${CMAKE_CURRENT_BINARY_DIR}/GrAFd_test)
