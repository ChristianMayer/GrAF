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

#include "logicengine.h"

#include <cstdint>
#include <boost/assert.hpp>
#include <sstream>
#include <iomanip>
#include <vector>

#include "logic_elements.h"


#define ASSERT_MSG(expr, msg) /*BOOST_ASSERT_MSG( expr, (std::stringstream() << msg).str().c_str() )*/

LogicEngine::LogicEngine( size_t maxSize )
{
  elementList = new LogicElement_Generic*[ maxSize ];
  elementCount = 0;
  globVar = new raw_t[10000];
  variableCount = variableStart();
  
  // make sure "ground" is zero:
  *reinterpret_cast<long long* const>( globVar + ground() ) = 0;
}

LogicEngine::~LogicEngine()
{
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

void LogicEngine::dump( void ) const
{
  std::cout << "Variable dump:" << std::endl;
  for( size_t i = 0; i < variableCount; i++ )
  {
    std::cout << std::setw(2) << std::setfill('0') << /*std::hex <<*/ i << std::dec;
    if( i%4==3 ) std::cout << " ";
  }
  std::cout << std::endl;
  for( size_t i = 0; i < variableCount; i++ )
  {
    std::cout << std::setw(2) << std::setfill('0') << std::hex << (int)globVar[i] << std::dec;
    if( i%4==3 ) std::cout << " ";
  }
  std::cout << std::endl;
  
  for( variableRegistry_t::const_iterator i = variableRegistry.cbegin(); i != variableRegistry.cend(); ++i )
  {
    std::cout << i->first << " (" << i->second.offset << ") ";
    std::cout << "<" << variableType::getTypeName( i->second.type ) << "> ";
    std::cout << "[" << read<int>( i->second.offset ) << "/" << read<float>( i->second.offset ) << "]: ";
    std::cout << (this->*(i->second.read))( i->second.offset  );
    std::cout << std::endl;
  }
}

void LogicEngine::run( const instructionPointer start ) const
{
  reinterpret_cast<instructionPointer*>(globVar)[0] = start;
  const instructionPointer elEnd = elementList + elementCount;
  
  while( reinterpret_cast<instructionPointer*>(globVar)[0] < elEnd )
  {
    //std::cout << reinterpret_cast<instructionPointer*>(globVar)[0]-elementList << ": ";
    (*reinterpret_cast<instructionPointer*>(globVar)[0])->calc( globVar );
    //dump();
    
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
    //out << (*ip)->dump() << std::endl;
    (*ip)->dump( out );
    
    ip++;
  }
  
  return out.str();
}

void LogicEngine::import_noGrAF( std::istream& in )
{
  std::string line;

  std::cout << "import_noGrAF\n";
  
  //typedef LogicElement_Generic* (*FactoryType)();
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
    getline( in, line );
    //std::cout << line << std::endl;
    
    // remove all whitespace
    size_t found;
    while( (found = line.find( " " )) != std::string::npos )  // kill space
    {
      line.replace( found, 1, "" );
    }
    while( (found = line.find( "\t" )) != std::string::npos ) // kill tab
    {
      line.replace( found, 1, "" );
    }
    
    if( line.length() == 0 )
      continue;  // nothing to do in a empty line
    
    // find parameters
    std::vector<std::string> params;
    size_t paramStart = line.find( "(" ) + 1;
    while( (found = line.find( ",", paramStart )) != std::string::npos )
    {
      //std::cout << "[" << paramStart << "," << found << "]" << std::endl;
      params.push_back( line.substr( paramStart, found - paramStart ) );
      paramStart = found+1;
    }
    if( (found = line.find( ")", paramStart )) != std::string::npos )
    {
      params.push_back( line.substr( paramStart, found - paramStart ) );
    } else {
      // FIXME thow error!
      // throw "Syntax error!";
      std::cout << "Syntax error!" << std::endl;
    }
      
    std::string le = line.substr( 0, line.find( "(" ) );
    
    /*
    std::cout << le << "{";
    for( size_t i = 0; i < params.size(); i++ )
      std::cout << params[i] << ";";
    std::cout << "}\n";
    */
    //addElement( lookup[ le ]( params ) );
    //LogicElement_Generic* e = lookup[ le ]( params );
    //std::cout << line << "\n";
    LogicElement_Generic::FactoryType ft = lookup[ le ];
    if( ft != nullptr )
      addElement( ft( params ) );
    else {
      // FIXME thow error!
      // throw "Syntax error!";
      std::cout << "Command not found! " << line << std::endl;
    }
    //std::cout << line << ": " << type_start << ((type_start != std::string::npos)?"j":"n") << std::endl;
  }
}
/*
std::string LogicEngine::variableRegistryStorage::read()
{
  return "foo";
}*/