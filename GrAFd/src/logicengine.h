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
#include <set>
#include <iostream>
#include <sstream>
#include <atomic>

#include "globals.h"

#include "variabletype.hpp"

class LogicElement_Generic;

class LogicEngine
{
public:
  /**
   * Instruction pointer - an iterator in the array
   */
  typedef LogicElement_Generic** instructionPointer;
  
  /**
   * The type of the possible states of the logic
   */
  enum logicState_t {
    STOPPED,  // script has no current information and not running
    COPIED,   // current values were copied, but script is not running
    RUNNING   // script is running
  };
  const char *logicStateName[3] = { "STOPPED", "COPIED", "RUNNING" };
  
private:
  /**
   * The logic ID of this logic.
   */
  const int thisLogicId;
  
  /**
   * State of the logic to handle thread synchronisation
   */
  std::atomic<logicState_t> logicState;
  
  /**
   * Should this script run again after finishing?
   */
  std::atomic<bool> rerun;
  
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
  variableRegistry_t importRegistriy;
  MessageRegister::timestamp_t lastVariableImport;
  
public:
  LogicEngine( size_t maxSize, int logicId  );
  ~LogicEngine();
  
  logicState_t getState( void ) const 
  {
    return logicState;
  }
  
  const char* getStateName( void ) const
  {
    return logicStateName[ logicState ];
  }
  
  /**
   * Set state to allow copying of variables.
   * @return true when state could be set
   */
  bool enableVariables( void )
  {
    if( STOPPED == logicState )
    {
      logicState = COPIED;
      return true;
    } 
    
    return false;
  }
  
  bool startLogic( void )
  {
    if( COPIED == logicState )
    {
      logicState = RUNNING;
      return true;
    } 
    
    return false;
  }
  
  bool stopLogic( void )
  {
    if( RUNNING == logicState )
    {
      logicState = STOPPED;
      return true;
    } 
    
    return false;
  }
  
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
  raw_offset_t registerVariable( const std::string& name )
  {
    register size_t thisVariable = variableCount;
    variableRegistry[ name ] = { thisVariable, variableType::getType<T>(), &LogicEngine::readString<T> };
    variableCount += sizeof( T );
    return thisVariable;
  }
  
  /**
   * Import a variable of size T. I.e. get it from the bus.
   */
  template<typename T>
  raw_offset_t importVariable( const std::string& name )
  {
    if( 0 != importRegistriy.count( name ) )
    {
      // already imported
      return variableRegistry[ name ].offset;
    }
    raw_offset_t pos = registerVariable<T>( name );
    registerVariable<int>( name + "_status" );
    importRegistriy[ name ] = variableRegistry[ name ];
    registry.subscribe( name, variableType::getType<T>(), thisLogicId );
    return pos;
  }
  
  /**
   * Get all bus variables
   */
  void copyImportedVariables( MessageRegister::timestamp_t timestamp )
  {
    for( auto it = importRegistriy.begin(); it != importRegistriy.end(); ++it )
    {
      register raw_t* var_p    = globVar + it->second.offset;
      register raw_t* status_p = var_p + variableType::sizeOf(it->second.type);
      
      *reinterpret_cast<int*>( status_p ) =
        registry.copy_value( it->first, it->second.type, var_p, lastVariableImport );
    }
    
    lastVariableImport = timestamp;
  }
  
  /**
   * Show all (named) variables
   */
  void dump( const std::string& prefix = "" ) const;
  
  /**
   * Run the logic
   */
  void run( const instructionPointer start ) const;
  void run() const
  {
    run( elementList );
  }
  
  /**
   * Do a full run, i.e. including copying of the variables
   */
  void scheduleRun( MessageRegister::timestamp_t timestamp = MessageRegister::now() )
  {
    logger << "!!! scheduleRun 0 rr:" << (rerun?"t":"f") << std::endl; logger.show();
    do {
      logger << "!!! scheduleRun 1 rr:" << (rerun?"t":"f") << std::endl; logger.show();
      copyImportedVariables( timestamp );
      logger << "!!! scheduleRun 2 rr:" << (rerun?"t":"f") << std::endl; logger.show();
      rerun = false;
      run();
      logger << "!!! scheduleRun 3 rr:" << (rerun?"t":"f") << std::endl; logger.show();
      timestamp = MessageRegister::now();
    } while( rerun );
    logger << "!!! scheduleRun 4 rr:" << (rerun?"t":"f") << std::endl; logger.show();
  }
  
  /**
   * Rerun this script after it was finished - e.g. because it's currently
   * running and new data has arrived.
   */
  void scheduleRerun( void )
  {
    rerun = true;
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