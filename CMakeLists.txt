cmake_minimum_required(VERSION 3.14)
project(seal_wrapper LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
# This addresses the pybind11 warning and ensures it uses the modern Python discovery method.
set(PYBIND11_FINDPYTHON ON)

# Find Python 3.11 explicitly. This is a crucial fix for the linker error.
find_package(Python 3.11 REQUIRED COMPONENTS Interpreter Development)

# Find Pybind11
find_package(pybind11 REQUIRED)

# Find Microsoft SEAL
# We point directly to the directory where the SEAL build process places its configuration.
find_package(SEAL CONFIG REQUIRED PATHS "C:/intelation/intelation/SEAL/build/cmake")

# Set up the Python module. The pybind11_add_module function handles the
# linking to Python libraries automatically.
pybind11_add_module(seal_wrapper seal_wrapper.cpp)

# Link the SEAL library. This is the only manual linking needed.
# Since SEAL builds as a static library on Windows, the SEAL::seal target
# will point to the .lib file. This is the correct way to link.
target_link_libraries(seal_wrapper PUBLIC SEAL::seal)
