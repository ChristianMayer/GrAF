/*
 * The Graphic Automation Framework deamon
 * Copyright (C) 2012, 2013  Christian Mayer - mail (at) ChristianMayer (dot) de
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

#ifndef LOGICENGINE_HPP
#define LOGICENGINE_HPP

#include <string>
#include <map>
#include <set>
#include <iostream>
#include <sstream>
#include <atomic>
#include <chrono>

#include "globals.h"

#include "variabletype.hpp"
#include "messageregister.hpp"
#include "logger.hpp"

class LogicElement_Generic;

/**
 * The LogicEngine holds and runs a list of LogicElements.
 */
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
    STOPPED,  ///< script has no current information and not running
    COPIED,   ///< current values were copied, but script is not running
    RUNNING   ///< script is running
  };
  /**
   * Map strings to the @p logicState_t constants.
   */
  constexpr static const char *const logicStateName[3] = { "STOPPED", "COPIED", "RUNNING" };
  
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
   * The first LogicElement that is from the normal task, i.e. not belonging to
   * the init task.
   */
  instructionPointer mainTask;

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
  variableRegistry_t importRegistry;
  typename MessageRegister::timestamp_t lastVariableImport;
  typedef std::chrono::duration<float, std::ratio<1>> seconds_float;
  
public:
  /**
   * Constructor.
   * 
   * Create a new LogicEngine where at most @p maxSize elements can be stored
   * and that has the ID @p logicId.
   * 
   * @param maxSize Maximum number of LogicElements
   * @param logicId ID of this LogicEngine
   */
  LogicEngine( size_t maxSize, int logicId=0 );
  LogicEngine( const LogicEngine& ) = delete; // no copy
  LogicEngine( LogicEngine&& );               // but move
  /**
   * Destructor.
   */
  ~LogicEngine();
  
  /**
   * Return the current state of the LogicEngine.
   */
  logicState_t getState( void ) const 
  {
    return logicState;
  }
  
  /**
   * Return an array of const chars of the name of the current state.
   */
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
  
  /**
   * Set the state of the LogicEngine to @p RUNNING - when possible.
   * 
   * @return @p true when the state could be changed<br>
   *         @p false when not.
   */
  bool startLogic( void )
  {
    if( COPIED == logicState )
    {
      logicState = RUNNING;
      return true;
    } 
    
    return false;
  }
  
  /**
   * Set the state of the LogicEngine to @p STOPPED - when possible.
   * 
   * @return @p true when the state could be changed<br>
   *         @p false when not.
   */
  bool stopLogic( void )
  {
    if( RUNNING == logicState )
    {
      logicState = STOPPED;
      return true;
    } 
    
    return false;
  }
  
  /**
   * Add an element at the end to the instructions of this LogicEngine.
   */
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
   * Set the current element as the start of the logic, i.e. the init task
   * has ended there already.
   */
  void markStartOfLogic( void )
  {
    mainTask = nextElementPosition();
  }
  
  /**
   * Register an anonymous variable of size T.
   */
  template<typename T>
  raw_offset_t registerVariable();
  
  /**
   * Register an anonymous variable of size T with the passed @p value.
   */
  template<typename T>
  raw_offset_t registerVariable( const T& value );
  
  /**
   * Register variable name of size T.
   */
  template<typename T>
  raw_offset_t registerVariable( const std::string& name );
  
  /**
   * Register variable @p name of size @p T with the passed @p value.
   */
  template<typename T>
  raw_offset_t registerVariable( const std::string& name, const T& value );
  
  /**
   * Register variable @p name of type @p type.
   * 
   * @param name The name of the variable.
   * @param type The type of the variable.
   */
  raw_offset_t registerVariable( const std::string& name, variableType::type type );
  
  /**
   * Register variable @p name of variable_t @p variable.
   * 
   * @param name     The name of the variable.
   * @param variable The variable.
   */
  raw_offset_t registerVariable( const std::string& name, const variable_t& variable );
  
  /**
   * Import a variable of size T. I.e. get it from the bus.
   */
  template<typename T>
  raw_offset_t importVariable( const std::string& name );
  
  /**
   * Get all bus variables
   */
  void copyImportedVariables( MessageRegister::timestamp_t timestamp );
  
  /**
   * Show all (named) variables
   */
  void dump( const std::string& prefix = "" ) const;
  
  /**
   * Run the logic, starting at @p start till @p elEnd.
   * 
   * @param start the first instruction to run.
   * @param elEnd one behind the last instruction to run.
   */
  void run( const instructionPointer start, const instructionPointer elEnd ) const;
  
  /**
   * Run the logic, start at the main task.
   */
  void run() const
  {
    run( mainTask, elementList + elementCount );
  }
  
  /**
   * Run only the initialisation instructions.
   */
  void run_init() const
  {
    run( elementList, mainTask );
  }
  
  /**
   * Do a full run, i.e. including copying of the variables
   */
  void scheduleRun( MessageRegister::timestamp_t timestamp = MessageRegister::now() );
  
  /**
   * Rerun this script after it was finished - e.g. because it's currently
   * running and new data has arrived.
   */
  void scheduleRerun( void )
  {
    rerun = true;
  }
  
  /**
   * Return the variable at @p offset, interpreting the raw data there as
   * type @p T.
   */
  template<typename T>
  T read( const raw_offset_t offset ) const
  {
    return *reinterpret_cast<T* const>( globVar + offset );
  }

  /*
  std::string readString( const raw_offset_t offset ) const
  {
    while( false && offset ); // stop warning...
    return "foo"; // *reinterpret_cast<T* const>( globVar + offset );
  }
  */
  
  /**
   * Return the variable at @p offset as a string.
   */
  template<typename T>
  std::string readString( const raw_offset_t offset ) const
  {
    std::stringstream sstr;
    sstr << read<T>( offset );//variableType::getType<T>();
    return sstr.str(); //*reinterpret_cast<T* const>( globVar + offset );
  }
  
  /**
   * Write the variable at @p offset with @p value.
   */
  template<typename T>
  void write( const raw_offset_t offset, const T& value )
  {
    *reinterpret_cast<T*>( globVar + offset ) = value;
  }
  
  /**
   * Write the variable at @p offset with @p value.
   */
  void write( const raw_offset_t offset, const variable_t& value )
  {
    value.getRaw( globVar + offset );
  }
  
  /**
   * Return the offset of the @p ground variable.
   */
  constexpr static raw_offset_t ground( void )
  {
    return sizeof(LogicElement_Generic*);
  }
  
  /**
   * Return the offset of the first variable.
   */
  constexpr static raw_offset_t variableStart( void )
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
   * Type of the translation map for import_noGrAF().
   */
  typedef std::map<std::string,std::string> translation_t;
  /**
   * Import the logic that was exported earlier.
   * The format used is the "native object GrAF" notation (abbreviation: noGrAF)
   */
  void import_noGrAF( std::istream& in, bool symbolicVariables = false, std::string prefix = "", const translation_t& translation = *static_cast<translation_t*>(nullptr) );
  
  /**
   * Count the amount of instructions in the passed string.
   */
  static size_t instructionsCount( const std::string& src );
};

template<typename T>
raw_offset_t LogicEngine::registerVariable()
{
  return variableCount += sizeof( T );
}

template<typename T>
raw_offset_t LogicEngine::registerVariable( const T& value )
{
  raw_offset_t thisVariable( registerVariable<T>() );
  write( thisVariable, value );
  return thisVariable;
}

template<typename T>
raw_offset_t LogicEngine::registerVariable( const std::string& name )
{
  register raw_offset_t thisVariable = variableCount;
  variableRegistry[ name ] = { thisVariable, variableType::getType<T>(), &LogicEngine::readString<T> };
  variableCount += sizeof( T );
  return thisVariable;
}

template<typename T>
raw_offset_t LogicEngine::registerVariable( const std::string& name, const T& value )
{
  raw_offset_t thisVariable( registerVariable<T>( name ) );
  write( thisVariable, value );
  return thisVariable;
}

template<typename T>
raw_offset_t LogicEngine::importVariable( const std::string& name )
{
  if( 0 != importRegistry.count( name ) )
  {
    // already imported
    return variableRegistry[ name ].offset;
  }
  raw_offset_t pos = registerVariable<T>( name );
  registerVariable<int>( name + "_status" );
  importRegistry[ name ] = variableRegistry[ name ];
  //TODO update and reenable: registry.subscribe( name, variableType::getType<T>(), thisLogicId );
  return pos;
}

#endif // LOGICENGINE_HPP
