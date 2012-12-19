/*
 *  <one line to give the program's name and a brief idea of what it does.>
 *  Copyright (C) 2012  Christian Mayer <email>
 * 
 *  This program is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 * 
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 * 
 *  You should have received a copy of the GNU General Public License
 *  along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

#include "graphblock.hpp"

#include "json.hpp"
#include <boost/concept_check.hpp>

using namespace std;

void GraphBlock::Port::setType( const string& t )
{
  if( "event" == t )
    type = EVENT;
  else if( "state" == t )
    type = STATE;
}

string GraphBlock::Port::getType( void ) const
{
  switch( type )
  {
    case EVENT:
      return "event";
    case STATE:
      return "state";
  }
  
  return "<unknown type>";
}

void GraphBlock::readJsonBlock( std::istream& in )
{
  JSON::readJsonObject( in, [this]( istream& in, const string& name ){
    double number;
    if( "width" == name )
    {
      in >> width;
    } else if( "height" == name )
    {
      in >> height;
    } else if( "rotation" == name )
    {
      in >> rotation;
    } else if( "flip" == name )
    {
      flip = JSON::readJsonBool( in );
    } else if( "color" == name )
    {
      int pos = 0;
      JSON::readJsonArray( in, [&]( istream& in ){
        in >> color[pos++];
        if( pos > 3 ) throw JSON::parseError( "More than three colors found!", in );
      });
    } else if( "background" == name )
    {
      int pos = 0;
      JSON::readJsonArray( in, [&]( istream& in ){
        in >> background[pos++];
        if( pos > 3 ) throw JSON::parseError( "More than three colors found!", in );
      });
    } else if( "inPorts" == name )
    {
      JSON::readJsonArray( in, [&]( istream& in ){
        Port p;
        JSON::readJsonObject( in, [&]( istream& in, const string& name ){
          if( "name" == name )
            p.name = JSON::readJsonString(in);
          else if( "type" == name )
            p.setType( JSON::readJsonString(in) );
          else
            throw( JSON::parseError( "unknown key '" + name + "' in port", in ) );
        });
        inPorts.push_back( p );
      });
    } else if( "outPorts" == name )
    {
      JSON::readJsonArray( in, [&]( istream& in ){
        Port p;
        JSON::readJsonObject( in, [&]( istream& in, const string& name ){
          if( "name" == name )
            p.name = JSON::readJsonString(in);
          else if( "type" == name )
            p.setType( JSON::readJsonString(in) );
          else
            throw( JSON::parseError( "unknown key '" + name + "' in port", in ) );
        });
        outPorts.push_back( p );
      });
    } else if( "parameters" == name )
    {
      JSON::readJsonObject( in, [&]( istream& in, const string& name ){
        string parameterType;
        JSON::readJsonObject( in, [&]( istream& in, const string& key ){
          if( "type" == key )
            parameterType = JSON::readJsonString(in);
          else if( "default" == key )
          {
            if( "float" == parameterType )
            {
              double number;
              in >> number;
              parameters[name] = number;
            } else 
              throw( JSON::parseError( "Unknown parameterType '"+parameterType+"' in for parameter '"+name+"' section", in ) );
          }
          else
            throw( JSON::parseError( "Unknown key '"+key+"' in for parameter '"+name+"' section", in ) );
        });
      });
    } else {
      throw( JSON::parseError( "Unknown key '"+name+"' for block", in ) );
    }
  });
}

ostream& operator<<( ostream &out, const GraphBlock& block )
{
  out 
  << "    {\n"
  << "      \"width\"     : " << block.width    << ",\n"
  << "      \"height\"    : " << block.height   << ",\n"
  << "      \"rotation\"  : " << block.rotation << ",\n"
  << "      \"flip\"      : " << (block.flip?"true":"false") << ",\n"
  << "      \"color\"     : [ " << block.color[0]      << ", " << block.color[1]      << ", " << block.color[2]      << " ],\n"
  << "      \"background\": [ " << block.background[0] << ", " << block.background[1] << ", " << block.background[2] << " ],\n"
  << "      \"inPorts\"   : [";
  for( auto it = block.inPorts.cbegin(); it != block.inPorts.cend(); it++ )
  {
    if( it != block.inPorts.cbegin() )
      out << ",\n";
    else
      out << "\n";

    out 
    << "        {\n"
    << "          \"name\": \"" << it->name << "\",\n"
    << "          \"type\": \"" << it->getType() << "\"\n"
    << "        }";
  }
  out
  << "\n      ],\n"
  << "      \"outPorts\": [";
  for( auto it = block.outPorts.cbegin(); it != block.outPorts.cend(); it++ )
  {
    if( it != block.outPorts.cbegin() )
      out << ",\n";
    else
      out << "\n";
    
    out 
    << "        {\n"
    << "          \"name\": \"" << it->name << "\",\n"
    << "          \"type\": \"" << it->getType() << "\"\n"
    << "        }";
  }
  out
  << "\n      ],\n"
  << "      \"parameters\": {";
  for( auto it = block.parameters.cbegin(); it != block.parameters.cend(); it++ )
  {
    if( it != block.parameters.cbegin() ) 
      out << ",\n";
    else
      out << "\n";
    
    out 
    << "        \"" << it->first << "\": {\n"
    << "          \"type\"   : \"" << it->second.getTypeName() << "\",\n"
    << "          \"default\": \"" << it->second.getAsString() << "\"\n"
    << "        }";
  }
  out << "\n      }\n";
  return out << "    }" << endl;
}
