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

#include "graph.hpp"

#include <string>

#include "json.hpp"
#include "logger.hpp"

using namespace std;

GraphLib Graph::lib; // give the static variable a home

Graph::Graph( const char* srcString )
{
  stringstream src( srcString );
  
  try {
    parseString( src );
  } catch( JSON::parseError e )
  {
    int lineNo, errorPos;
    string wrongLine = e.getErrorLine( lineNo, errorPos ) ;
    logger << "!!! caugt error \"" << e.text << "\" in line " << lineNo << " at postion " << errorPos << ":\n";
    logger << "!!! " << wrongLine << "\n";
    logger << "!!!";
    while( 1 < errorPos-- )
      logger << " ";
    logger << "-^-" << endl;
    logger.show();
  } catch( parseError e )
  {
    logger << "parseError: '" << e.text << "' at '" << e.pos << "'\n";
    logger.show();
  } catch( ... )
  {
    logger << "Exception!\n";
    logger.show();
  }
  
  std::vector<vertex_t> topo_order;
  
  boost::topological_sort(g, std::back_inserter(topo_order));
  
  // Print the results.
  for( auto i = topo_order.crbegin(); i != topo_order.crend(); ++i )
  {
    logger << *i << ": " << g[*i].name << " = " << blockLookup[g[*i].name] << std::endl;
  }

  logger.show();
}

void Graph::grepBlock( istream& in )
{
  JSON::readJsonObject( in, [&, this]( istream& in, const string& name ){
    blockLookup[ name ] = boost::add_vertex( g );
    Block& thisBlock = g[ blockLookup[ name ] ];
    thisBlock.name = name;
    JSON::readJsonObject( in, [&thisBlock]( istream& in, const string& key ){
      
      if       ( "type"       == key )
      {
        if( "" == (thisBlock.type = JSON::readJsonString(in) ) ) throw( JSON::parseError(  "String for block parameter 'type' expected", in ) );
      } else if( "x"          == key )
      {
        in >> thisBlock.x;
      } else if( "y"          == key )
      {
        in >> thisBlock.y;
      } else if( "width"      == key )
      {
        in >> thisBlock.width;
      } else if( "height"     == key )
      {
        in >> thisBlock.height;
      } else if( "flip"       == key )
      {
        thisBlock.flip        = JSON::readJsonBool( in );
      } else if( "parameters" == key )
      {
        JSON::readJsonObject( in, [&thisBlock]( istream& in, const string& key ){
          switch( JSON::identifyNext(in) )
          {
            case JSON::NUMBER:
              double number;
              in >> number;
              thisBlock.parameters[ key ] = number;
              break;
              
            case JSON::STRING:
              thisBlock.parameters[ key ] = JSON::readJsonString(in);
              break;
              
            default:
              throw( JSON::parseError( "Paramenter entry type unexpected", in ) );
          }
        });
      } else
        throw( JSON::parseError( "Block paramenter expected", in ) );
    });
  });
}

void Graph::grepSignal( istream& in )
{
  JSON::readJsonArray( in, [&]( istream& in ){
    int count = 0;
    string fromBlock, toBlock;
    int fromPort, toPort;
    JSON::readJsonArray( in, [&]( istream& in ){
      switch( count++ )
      {
      case 0:
        fromBlock = JSON::readJsonString( in );
        break;
      case 1:
        in >> fromPort;
        break;
      case 2:
        toBlock = JSON::readJsonString( in );
        break;
      case 3:
        in >> toPort;
        break;
      case 4:
        JSON::readJsonObject( in, []( istream& in, const string& dummy ){
        });
        break;
      default:
        throw( JSON::parseError( "Wrong number of entries in signals section!", in ) );
      }
    });
    edge_t e1;
    bool ok;
    boost::tie( e1, ok ) = boost::add_edge( blockLookup[fromBlock], blockLookup[toBlock], g );
    g[e1].fromPort = fromPort;
    g[e1].toPort   = toPort;
    //g[e1].optional = optional;
  });
}

void Graph::parseString( istream& in )
{
  in >> JSON::consumeEmpty;
  JSON::readJsonObject( in, [this]( istream& in, const string& section )
  {
    in >> JSON::consumeEmpty;
    if( "blocks" == section )
    {
      grepBlock( in );
    } else if( "signals" == section )
    {
      grepSignal( in );
    } else 
      throw( JSON::parseError( "Bad file structure, only 'blocks' and 'signals' allowed!", in) );
  });
}

ostream& operator<<(ostream &stream, const Graph::Block& block)
{
  stream << "{\n";
  stream << "    \"type\":       \"" << block.type   << "\",\n";
  stream << "    \"x\":          "   << block.x      << ",\n";
  stream << "    \"y\":          "   << block.y      << ",\n";
  stream << "    \"width\":      "   << block.width  << ",\n";
  stream << "    \"height\":     "   << block.height << ",\n";
  stream << "    \"flip\":       "   << (block.flip?"true":"false") << ",\n";
  if( block.parameters.cbegin() == block.parameters.cend() )
  {
    stream << "    \"parameters\": {}\n";
  } else {
    stream << "    \"parameters\": {\n";
    for( auto it = block.parameters.cbegin();; )
    {
      stream << "      \"" << ( *it ).first << "\": \"" << ( *it ).second.getAsString() << "\"";
      if( ( ++it ) != block.parameters.cend() )
        stream << ",\n";
      else
      {
        stream << "\n";
        break;
      }
    }
    stream << "    }\n";
  } 
  stream << "  }";
  return stream;
}

ostream& operator<<( ostream &stream, const Graph::Signal& signal )
{
  stream << "  [";
  //stream << "\"" << signal.first->first << "\", "; FIXME
  stream <<         signal.fromPort  <<   ", ";
  //stream << "\"" << signal.second->first   << "\", "; FIXME
  stream <<         signal.toPort    <<   ", ";
  stream << "{"  << signal.optional  << "}";
  stream << "]";
  return stream;
}
