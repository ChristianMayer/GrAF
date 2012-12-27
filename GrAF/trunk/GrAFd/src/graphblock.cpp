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

#include "graphblock.hpp"

#include "graph.hpp"
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

void GraphBlock::grepBlock( istream& in, Graph& graph )
{
  JSON::readJsonObject( in, [&graph]( istream& in1, const string& name ){
    graph.blockLookup[ name ] = boost::add_vertex( graph.g );
    GraphBlock& thisBlock = graph.g[ graph.blockLookup[ name ] ];
    thisBlock.name = name;
    JSON::readJsonObject( in1, [&thisBlock]( istream& in2, const string& key ){
      if       ( "type"       == key )
      {
        if( "" == (thisBlock.type = JSON::readJsonString(in2) ) ) throw( JSON::parseError(  "String for block parameter 'type' expected", in2 ) );
      } else if( "x"          == key )
      {
        in2 >> thisBlock.x;
      } else if( "y"          == key )
      {
        in2 >> thisBlock.y;
      } else if( "width"      == key )
      {
        in2 >> thisBlock.width;
      } else if( "height"     == key )
      {
        in2 >> thisBlock.height;
      } else if( "flip"       == key )
      {
        thisBlock.flip        = JSON::readJsonBool( in2 );
      } else if( "parameters" == key )
      {
        JSON::readJsonObject( in2, [&thisBlock]( istream& in3, const string& key2 ){
          switch( JSON::identifyNext(in3) )
          {
            case JSON::NUMBER:
              double number;
              in3 >> number;
              thisBlock.parameters[ key2 ] = number;
              break;
              
            case JSON::STRING:
              thisBlock.parameters[ key2 ] = JSON::readJsonString(in3);
              break;
              
            default:
              throw( JSON::parseError( "Paramenter entry type unexpected", in3 ) );
          }
        });
      } else
        throw( JSON::parseError( "Block paramenter expected", in2 ) );
    });
    
    // now the memory contains the Graph as read - but to make it runnable
    // the state ports have to be split or the topological sort would find an
    // algebraic loop
    if( !graph.lib.hasElement( thisBlock.type ) )
    {
      throw( JSON::parseError( "Block of type '" + thisBlock.type + "' not found in library", in1 ) );
    }
    const GraphBlock &libBlock = graph.libLookup( thisBlock );
    bool blockNotCopyied = true;
    for( auto p = libBlock.outPorts.cbegin(); p != libBlock.outPorts.cend(); ++p )
    {
      if( GraphBlock::Port::STATE == p->type )
      {
        if( blockNotCopyied )
        {
          graph.blockLookup[ name + ".state" ] = boost::add_vertex( graph.g );
          GraphBlock& stateBlock = graph.g[ graph.blockLookup[ name + ".state" ] ];
          stateBlock.name = name + ".state";
          stateBlock.isStateCopy = true;
          stateBlock.type = graph.g[ graph.blockLookup[ name ] ].type; //NOTE: thisBlock is invalid due to boost::add_vertex( g )
          stateBlock.implementation = " ";//"... copy state port ...";
          blockNotCopyied = false;
        } else {
          GraphBlock& stateBlock = graph.g[ graph.blockLookup[ name + ".state" ] ];
          stateBlock.implementation += " ";//"... copy other state port ...";
        }
      }
    }
  });
}


void GraphBlock::readJsonBlock( std::istream& in )
{
  JSON::readJsonObject( in, [this]( istream& in, const string& name ){
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
    } else if( "init" == name )
    {
      init = JSON::readJsonString( in );
    } else if( "implementation" == name )
    {
      implementation = JSON::readJsonString( in );
    }else {
      throw( JSON::parseError( "Unknown key '"+name+"' for block", in ) );
    }
  });
}

ostream& operator<<( ostream &out, const GraphBlock& block )
{
  out 
  << "    {\n"
  << "      \"name\"      : \"" << block.name   << "\",\n"
  << "      \"type\"      : \"" << block.type   << "\",\n"
  << "      \"x\"         : " << block.x        << ",\n"
  << "      \"y\"         : " << block.y        << ",\n"
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
  out 
  << "\n      },\n"
  << "      \"init\"               : \"" << block.init           << "\"\n"
  << "      \"implementation\"     : \"" << block.implementation << "\"\n";
  return out << "    }" << endl;
}
