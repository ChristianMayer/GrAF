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

#include "logicengine.hpp"

#include <cstdint>
#include <sstream>
#include <iomanip>
#include <vector>
#include <string>

#include "globals.h"

#include "logger.hpp"
#include "logic_elements.hpp"
#include "json.hpp"
#include "utilities.hpp"

constexpr const char *const LogicEngine::logicStateName[]; // give it a home

LogicEngine::LogicEngine( size_t maxSize, int logicId ) :
  thisLogicId( logicId ),
  logicState( STOPPED ),
  rerun( false ),
  variableRegistry( {std::pair<std::string, variableRegistryStorage>( "ground", { ground(), variableType::getType<float>(), &LogicEngine::readString<float> } )} ),
  lastVariableImport( MessageRegister::now() )
{
  elementList = new LogicElement_Generic*[ maxSize ];
  elementCount = 0;
  mainTask = elementList;
  globVar = new raw_t[10000]; // FIXME make dynamic!!!
  for( size_t initp = 0; initp != 10000; initp++ ) globVar[initp]=0; // make valgrind happy for now...
  variableCount = variableStart();
  
  // make sure "ground" is zero:
  *reinterpret_cast<long long* const>( globVar + ground() ) = 0;
  
  logger << "created Logicengine #" << thisLogicId << " @ " << this << " for " << maxSize << " entries;\n"; logger.show();
}

LogicEngine::LogicEngine( LogicEngine&& other )
: thisLogicId( other.thisLogicId ),
  logicState( other.logicState.load() ),
  rerun( other.rerun.load() ),
  mainTask( std::move( other.mainTask ) ),
  lastVariableImport( std::move( other.lastVariableImport ) )
{
  std::swap( elementList, other.elementList );
  std::swap( elementCount, other.elementCount );
  std::swap( globVar, other.globVar );
  
  logger << "moved Logicengine #" << thisLogicId << " @ " << this << ";\n"; logger.show();
}

LogicEngine::~LogicEngine()
{
  logger << "destructing LogicEngine @ " << this << ", deleting " << elementCount << " elements;\n"; logger.show();
  for( size_t i = 0; i < elementCount; ++i )
  {
    delete elementList[i];
  }
  delete[] elementList;
}

void LogicEngine::addElement( LogicElement_Generic* element )
{
  elementList[elementCount++] = element;
}

raw_offset_t LogicEngine::registerVariable( const std::string& name, variableType::type type )
{
  switch( type )
  {
    case variableType::INT:
      return registerVariable<int>( name );
      
    case variableType::FLOAT:
      return registerVariable<float>( name );
      
    /* // FIXME - probaby bad idea...
    case variableType::STRING:
    {
      auto var = variableRegistry.find( name );
      if( variableRegistry.end() == var )
        throw( JSON::parseError( "Unknown string: '" + name + "'", __LINE__ ,__FILE__ ) );
      return var->second.offset;
    }*/
   
    default:
      throw( JSON::parseError( std::string("Unsupported Type: '") + variableType::getTypeName( type ) + "'", __LINE__ ,__FILE__ ) );
  }
  
  // will never reach this
  return 0; 
}

raw_offset_t LogicEngine::registerVariable( const std::string& name, const variable_t& variable )
{
  raw_offset_t thisVariable( registerVariable( name, variable.getType() ) );
  write( thisVariable, variable );
  return thisVariable;
}

void LogicEngine::copyImportedVariables( MessageRegister::timestamp_t timestamp )
{
  for( auto it = importRegistry.begin(); it != importRegistry.end(); ++it )
  {
    register raw_t* var_p    = globVar + it->second.offset;
    register raw_t* status_p = var_p + variableType::sizeOf(it->second.type);
    
    *reinterpret_cast<int*>( status_p ) =
    registry.copy_value( it->first, it->second.type, var_p, lastVariableImport );
  }
  
  lastVariableImport = timestamp;
}

void LogicEngine::dump( const std::string& prefix ) const
{
  logger( Logger::INFO ) << prefix << "Variable dump:\n" << prefix;
  for( size_t i = 0; i < variableCount; i++ )
  {
    logger << std::setw(2) << std::setfill('0') << /*std::hex <<*/ i << std::dec;
    if( i%4==3 ) logger << " ";
  }
  logger << "\n";
  logger << prefix;
  for( size_t i = 0; i < variableCount; i++ )
  {
    logger << std::setw(2) << std::setfill('0') << std::hex << static_cast<int>(globVar[i]) << std::dec;
    if( i%4==3 ) logger << " ";
  }
  logger << "\n";
  
  for( variableRegistry_t::const_iterator i = variableRegistry.cbegin(); i != variableRegistry.cend(); ++i )
  {
    logger << prefix << i->first << " (" << i->second.offset << ") ";
    logger << "<" << variableType::getTypeName( i->second.type ) << "> ";
    logger << "[" << read<int>( i->second.offset ) << "/" << read<float>( i->second.offset ) << "]: ";
    logger << (this->*(i->second.read))( i->second.offset  );
    logger << std::endl;
  }
  
  logger.show();
}

void LogicEngine::run( const instructionPointer start, const instructionPointer elEnd ) const
{
  logger << "LogicEngine("<<this<<")::run( " << start << ", " << elEnd << "), logicState: " << logicState << " => Running: " << (RUNNING == logicState?"true":"false") <<"\n"; logger.show();

  ASSERT_MSG( start < elEnd, "Instruction pointers unplausible, " << start << " must be less than " << elEnd );
  
  // check if state is correct
  ASSERT_MSG( RUNNING == logicState, "LogicEngine::run() called during wrong state (" << logicStateName[logicState] << ")" );
  
  instructionPointer& ip = reinterpret_cast<instructionPointer*>(globVar)[0];
  //reinterpret_cast<instructionPointer*>(globVar)[0] = start;
  ip = start;
  logger << "LogicEngine("<<this<<")::run: is running from " << start << " to " << elEnd << "...\n"; logger.show();
  //while( reinterpret_cast<instructionPointer*>(globVar)[0] < elEnd )
  while( ip < elEnd )
  {
    //ip = reinterpret_cast<instructionPointer*>(globVar)[0];
    (*ip)->dump( logger << "calling " << ip << ": " ); logger.show();
    
    (*ip)->calc( globVar );
    
    ASSERT_MSG( 
      elementList <= ip && 
      ( ip <= elEnd || ip == reinterpret_cast<instructionPointer>(SIZE_MAX)),
      "LogicEngine instruction pointer " << ip << " out of valid range "
        << elementList << " ... " << elEnd << "!"
    );
  }
}

void LogicEngine::scheduleRun( MessageRegister::timestamp_t timestamp )
{
  logger << this << ": !!! scheduleRun 0 rr:" << (rerun?"t":"f") << ", state: " << logicStateName[logicState] << std::endl; logger.show();
  do {
    logger << this << ": !!! scheduleRun 1 rr:" << (rerun?"t":"f") << ", state: " << logicStateName[logicState] << std::endl; logger.show();
    write<float>( variableRegistry.at( "__dt" ).offset, std::chrono::duration_cast<seconds_float>(timestamp - lastVariableImport).count() );
    copyImportedVariables( timestamp );
    logger << this << ": !!! scheduleRun 2 rr:" << (rerun?"t":"f") << ", state: " << logicStateName[logicState] << std::endl; logger.show();
    rerun = false;
    run();
    logger << this << ": !!! scheduleRun 3 rr:" << (rerun?"t":"f") << ", state: " << logicStateName[logicState] << std::endl; logger.show();
    timestamp = MessageRegister::now();
    bool could_stop = stopLogic();
    ASSERT_MSG( could_stop, "LogicEngine state couldn't be set to STOPPED!" );
    logger << this << ": !!! scheduleRun 4 rr:" << (rerun?"t":"f") << ", state: " << logicStateName[logicState] << std::endl; logger.show();
  } while( rerun );
  logger << this << ": !!! scheduleRun 5 rr:" << (rerun?"t":"f") << ", state: " << logicStateName[logicState] << std::endl; logger.show();
  dump();
}

std::string LogicEngine::export_noGrAF( void ) const
{
  std::stringstream out;
  
  instructionPointer ip = elementList;
  const instructionPointer elEnd = elementList + elementCount;
  while( ip != elEnd )
  {
    if( ip == mainTask )
      out << "// mainTask:\n";
    
    (*ip)->dump( out );
    
    ip++;
  }
  
  return out.str();
}

void LogicEngine::import_noGrAF( std::istream& in, bool symbolicVariables, std::string prefix, const translation_t& translation )
{
  std::string line;

  typedef std::map< std::string, std::pair<const LogicElement_Generic::signature_t&, LogicElement_Generic::FactoryType> > le_map;
  static const le_map lookup {
    { "const<float>"   , le_map::value_type::second_type( LogicElement_Const<float>   ::signature, LogicElement_Const<float>   ::create ) },
    { "move<float>"    , le_map::value_type::second_type( LogicElement_Move<float>    ::signature, LogicElement_Move<float>    ::create ) },
    { "mul<float>"     , le_map::value_type::second_type( LogicElement_Mul<float>     ::signature, LogicElement_Mul<float>     ::create ) },
    { "muladd<float>"  , le_map::value_type::second_type( LogicElement_MulAdd<float>  ::signature, LogicElement_MulAdd<float>  ::create ) },
    { "rel<bool,float>", le_map::value_type::second_type( LogicElement_Rel<bool,float>::signature, LogicElement_Rel<bool,float>::create ) },
    { "jumptrue<bool>" , le_map::value_type::second_type( LogicElement_JumpTrue<bool> ::signature, LogicElement_JumpTrue<bool> ::create ) },
    { "send<float>"    , le_map::value_type::second_type( LogicElement_Send<float>    ::signature, LogicElement_Send<float>    ::create ) },
    { "get<float>"     , le_map::value_type::second_type( LogicElement_Get<float>     ::signature, LogicElement_Get<float>     ::create ) },
    { "sum<float>"     , le_map::value_type::second_type( LogicElement_Sum<float>     ::signature, LogicElement_Sum<float>     ::create ) }
  };
  
  while( in.good() )
  {
    in >> std::ws; // remove all whitespace

    if( in.eof() ) // probably reached EOF after consuming the whitespaces
      break;
    
    getline( in, line );
    
    if( '/' == line[0] && '/' == line[1] ) // skip comment
      continue;

    if( "var " == line.substr( 0, 4 ) )
    {
      // variable definition found
      auto found = line.find( " ", 4 );
      if( found == std::string::npos )
        throw( JSON::parseError( "Implementation error at variable definition: '" + line + "'", __LINE__ ,__FILE__ ) );
      
      std::string type = line.substr( 4, found - 4 );
      std::string name = prefix + line.substr( found + 1 );

      if( "bool" == type )
        registerVariable<bool>( name );
      else if( "int" == type )
        registerVariable<int>( name );
      else if( "float" == type )
        registerVariable<float>( name );
      else
        throw( JSON::parseError( "Implementation error at variable definition, unknown type '" + type + "' in '" + line + "'", __LINE__ ,__FILE__ ) );
      
      continue;
    }
    
    // remove all internal whitespace
    {
      auto writer = line.begin();
      auto end    = line.end();
      for( auto reader = line.begin() ; reader != end; reader++ )
        if( (' ' != *reader ) && ('\t' != *reader ) )
          *writer++ = *reader;
      line.erase( writer, end );
    }
    
    if( line.length() == 0 )
      continue;  // nothing to do in a empty line
      
    size_t paramStart = line.find( "(" );
    auto instruction = lookup.find( line.substr( 0, paramStart ) );
    if( lookup.end() == instruction )
    {
      throw( JSON::parseError( "Command '" + line.substr( 0, paramStart ) + "' not found!", __LINE__ ,__FILE__ ) );
    }
      
    // find parameters
    size_t found;
    paramStart++; // move post '('
    std::vector<std::string> params;
    auto getParam = [&]( size_t start, size_t end ) -> std::string {
      std::string pureVar = line.substr( start, end - start );
      switch( instruction->second.first.at(params.size()) )
      {
        case LogicElement_Generic::VARIABLE_T:
          if( '"' == pureVar[0] )
            return pureVar.substr( 1, pureVar.length()-2 );
          return pureVar;
          
        case LogicElement_Generic::STRING:
          if( '"' == pureVar[0] )
            return pureVar.substr( 1, pureVar.length()-2 );
          {
            auto variable = translation.find( prefix + pureVar );
            if( translation.end() != variable )
              return variable->second;
            variable = translation.find( pureVar );
            if( translation.end() != variable )
              return variable->second;
          }
          return pureVar;
          
        default:
          ;// just continue outside...
      } 
      
      // case LogicElement_Generic::OFFSET:
      if( std::all_of(pureVar.begin(), pureVar.end(), ::isdigit) )
        return pureVar;

      std::string var = prefix + pureVar;
      if( symbolicVariables )
      {
        auto translationEntry = translation.find( var );
        if( translationEntry != translation.end() )
          var = translationEntry->second;
        auto variable = variableRegistry.find( var );
        
        if( variableRegistry.end() == variable ) // if not found: retry global
          variable = variableRegistry.find( pureVar );
        
        if( variableRegistry.end() == variable ) 
          throw( JSON::parseError( "Variable '" + var + "' not found! Connection missing?", __LINE__ ,__FILE__ ) );
        
        return std::to_string( variable->second.offset );
      }
      else
        return var;
    };

    while( (found = line.find( ",", paramStart )) != std::string::npos )
    {
      params.push_back( getParam( paramStart, found ) );
      paramStart = found+1;
    }
    if( (found = line.find( ")", paramStart )) != std::string::npos )
    {
      params.push_back( getParam( paramStart, found ) );
    } else {
      // FIXME thow error!
      // throw "Syntax error!";
      logger << "Syntax error! '" << line << "'" << std::endl;
    }
    
    addElement( instruction->second.second( this, params ) ); // add by calling the Factory function
  }
}

size_t LogicEngine::instructionsCount( const std::string& src )
{
  size_t retval = 0;
  std::stringstream in( src );
  std::string line;
  
  while( in.good() )
  {
    in >> std::ws; // remove all whitespace
    
    if( in.eof() ) // probably reached EOF after consuming the whitespaces
      break;
    
    getline( in, line );
    
    if( '/' == line[0] && '/' == line[1] ) // skip comment
      continue;
    
    if( "var " == line.substr( 0, 4 ) )
      continue;
    
    // once we get here, we are really seeing an instruction
    retval++;
  }
  
  return retval;
}
