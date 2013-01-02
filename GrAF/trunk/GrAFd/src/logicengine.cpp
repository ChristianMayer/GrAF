/*
 * The Graphic Automation Framework deamon
 * Copyright (C) 2012  Christian Mayer - mail (at) ChristianMayer (dot) de
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

#define ASSERT_MSG(expr, msg) /*BOOST_ASSERT_MSG( expr, (std::stringstream() << msg).str().c_str() )*/

constexpr const char *const LogicEngine::logicStateName[]; // give it a home

LogicEngine::LogicEngine( size_t maxSize, int logicId ) :
  thisLogicId( logicId ),
  logicState( STOPPED ),
  rerun( false )
{
  elementList = new LogicElement_Generic*[ maxSize ];
  elementCount = 0;
  mainTask = elementList;
  globVar = new raw_t[10000];
  variableCount = variableStart();
  
  // make sure "ground" is zero:
  *reinterpret_cast<long long* const>( globVar + ground() ) = 0;
  
  logger << "created Logicengine #" << thisLogicId << " @ " << this << " for " << maxSize << " entries;\n"; logger.show();
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
    logger << std::setw(2) << std::setfill('0') << std::hex << (int)globVar[i] << std::dec;
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

void LogicEngine::run( const instructionPointer start ) const
{
  // check if state is correct
  if( RUNNING != logicState )
    return;
  
  reinterpret_cast<instructionPointer*>(globVar)[0] = start;
  const instructionPointer elEnd = elementList + elementCount;
  
  while( reinterpret_cast<instructionPointer*>(globVar)[0] < elEnd )
  {
    (*reinterpret_cast<instructionPointer*>(globVar)[0])->calc( globVar );
    
    ASSERT_MSG( 
      elementList <= reinterpret_cast<instructionPointer*>(globVar)[0] && 
      ( reinterpret_cast<instructionPointer*>(globVar)[0] <= elEnd || 
      reinterpret_cast<instructionPointer*>(globVar)[0] == reinterpret_cast<instructionPointer>(SIZE_MAX)),
      "LogicEngine instruction pointer out of valid range!"
    );
  }
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

  typedef std::map< std::string, LogicElement_Generic::FactoryType > le_map;
  le_map lookup;
  lookup["const<float>"] = LogicElement_Const<float>::create;
  lookup["const<int>"] = LogicElement_Const<int>::create;
  lookup["jump"] = LogicElement_Jump::create;
  lookup["jumptrue<int>"] = LogicElement_JumpTrue<int>::create;
  lookup["move<float>"] = LogicElement_Move<float>::create;
  lookup["move<int>"] = LogicElement_Move<int>::create;
  lookup["mul<float>"] = LogicElement_Mul<float>::create;
  lookup["muladd<float>"] = LogicElement_MulAdd<float>::create;
  lookup["mulsub<float>"] = LogicElement_MulSub<float>::create;
  lookup["rel<int,float>"] = LogicElement_Rel<int,float>::create;
  lookup["sum<float>"] = LogicElement_Sum<float>::create;
  lookup["sum<int>"] = LogicElement_Sum<int>::create;
  
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
        throw( JSON::parseError( "Implementation error at variable definition: '" + line + "'" ) );
      
      std::string type = line.substr( 4, found - 4 );
      std::string name = prefix + line.substr( found + 1 );
      if( "int" == type )
        registerVariable<int>( name );
      else if( "float" == type )
        registerVariable<float>( name );
      else
        throw( JSON::parseError( "Implementation error at variable definition, unknown type '" + type + "' in '" + line + "'" ) );
      
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
      
    //logger << "add command: '" << line << "'" << std::endl;
    
    // find parameters
    size_t found;
    std::vector<std::string> params;
    size_t paramStart = line.find( "(" ) + 1;
    auto getParam = [&]( size_t start, size_t end ) -> std::string {
      std::string var = prefix + line.substr( start, end - start );
      if( symbolicVariables )
      {
        auto translationEntry = translation.find( var );
        if( translationEntry != translation.end() )
          var = translationEntry->second;
        auto variable = variableRegistry.find( var );
        
        if( variableRegistry.end() == variable ) // if not found: retry global
          variable = variableRegistry.find( line.substr( start, end - start ) );
        
        if( variableRegistry.end() == variable ) throw( JSON::parseError( "Variable '" + var + "' not found!" ) );
        return std::to_string( variable->second.offset );
      }
      else
        return var;
    };

    while( (found = line.find( ",", paramStart )) != std::string::npos )
    {
      //logger << "[" << paramStart << "," << found << "]" << std::endl;
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
    
    std::string le = line.substr( 0, line.find( "(" ) );
    
    LogicElement_Generic::FactoryType ft = lookup[ le ];
    if( ft != nullptr )
      addElement( ft( params ) );
    else {
      // FIXME thow error!
      // throw "Syntax error!";
      logger << "Command '" << le << "' not found! Line: '" << line << "'" << std::endl;
    }
    //logger << "added le '" << le << "'"<<std::endl; logger.show(); line = "foo";
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
