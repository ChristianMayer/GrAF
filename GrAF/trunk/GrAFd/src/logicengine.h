/*
    <one line to give the program's name and a brief idea of what it does.>
    Copyright (C) 2012  Christian Mayer <email>

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/


#ifndef LOGICENGINE_H
#define LOGICENGINE_H

#include <string>
#include <map>
#include <iostream>
#include <sstream>

#include "globals.h"


#include "logic_elements/variabletype.hpp"

//#include "logic_elements.h"
class LogicElement_Generic;

class LogicEngine
{
public:
  /**
   * Instruction pointer - an iterator in the array
   */
  typedef LogicElement_Generic** instructionPointer;
  
private:
  /**
   * Array of all the pointers to the LogicElements
   */
  LogicElement_Generic** elementList;
  
  /**
   * The number of elements in the array elementList[]
   */
  size_t elementCount;
  
  /**
   * Store of all variables.
   * Setup:
   * 0 .. sizeof(LogicElement_Generic*): instruction pointer
   *   .. sizeof(long long):             ground, i.e. zero
   * following:                          the variables
   */
  raw_t *globVar;
  
  /**
   * The number of physical elements in the array globVar[].
   * NOTE: this is the amount of used RAM, the numbler of logical elements
   * will usually be much smaller!
   */
  size_t variableCount;
  
  struct variableRegistryStorage
  {
    raw_offset_t offset;
    variableType::type type;
    std::string (LogicEngine::*read)( const raw_offset_t ) const;
  };
  typedef std::map<std::string, variableRegistryStorage> variableRegistry_t;
  variableRegistry_t variableRegistry;
  
public:
  LogicEngine( size_t maxSize );
  ~LogicEngine();
  
  void addElement( LogicElement_Generic* element );
  
  /**
   * Get the position of the next element that will be added.
   * (This can be used to get a pointer to a function prior to adding it)
   */
  instructionPointer nextElementPosition( void ) const
  {
    return elementList + elementCount;
  }
  
  /**
   * Register an anonymous variable of size T.
   */
  template<typename T>
  raw_offset_t registerVariable()
  {
    return variableCount += sizeof( T );
  }
  
  /**
   * Register variable name of size T.
   */
  template<typename T>
  raw_offset_t registerVariable( std::string name )
  {
    register size_t thisVariable = variableCount;
    variableRegistry[ name ] = { thisVariable, variableType::getType<T>(), &LogicEngine::readString<T> };
    variableCount += sizeof( T );
    return thisVariable;
  }
  
  /**
   * Show all (named) variables
   */
  void dump( void ) const;
  
  /**
   * Run the logic
   */
  void run( const instructionPointer start ) const;
  void run( void ) const
  {
    run( elementList );
  }
  
  template<typename T>
  T read( const raw_offset_t offset ) const
  {
    return *reinterpret_cast<T* const>( globVar + offset );
  }

  std::string readString( const raw_offset_t offset ) const
  {
    while( false && offset ); // stop warning...
    return "foo"; //*reinterpret_cast<T* const>( globVar + offset );
  }
  
  template<typename T>
  std::string readString( const raw_offset_t offset ) const
  {
    std::stringstream sstr;
    sstr << read<T>( offset );//variableType::getType<T>();
    return sstr.str(); //*reinterpret_cast<T* const>( globVar + offset );
  }
  
  raw_offset_t ground( void ) const
  {
    return sizeof(LogicElement_Generic*);
  }
  
  raw_offset_t variableStart( void ) const
  {
    return ground() + sizeof(long long);
  }
  
  /**
   * Export the logic in a way that could be imported later. This allows storing
   * the logic in a file.
   * The format used is the "native object GrAF" notation (abbreviation: noGrAF)
   */
  std::string export_noGrAF( void ) const;
  
  /**
   * Import the logic that was exported earlier.
   * The format used is the "native object GrAF" notation (abbreviation: noGrAF)
   */
  void import_noGrAF( std::istream& in );
};

#endif // LOGICENGINE_H
