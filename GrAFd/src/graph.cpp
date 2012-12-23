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

Graph::Graph( LogicEngine& logicEngine, const char* string ) : le( logicEngine )
{
  stringstream stream( string );
  parseString( stream );
  
  // FIXME add rest
}

Graph::Graph( LogicEngine& logicEngine, istream& stream ) : le( logicEngine )
{
  parseString( stream );
  
  std::vector<vertex_t> topo_order;
  boost::topological_sort(g, std::back_inserter(topo_order));
  
  le.registerVariable<float>( "__dt" );
  
  // Register the variables
  for( auto i = topo_order.crbegin(); i != topo_order.crend(); ++i )
  {
    auto &block = g[*i];
    auto &libBlock = libLookup( g[*i] );
    
    // register parameters
    if( !block.isStateCopy )
    {    
      for( auto it = block.parameters.cbegin(); it != block.parameters.cend(); it++ )
      {
        le.registerVariable( block.name + "/" + it->first, it->second.getType() );
      }
    }
    
    // register outPorts
    for( auto it = libBlock.outPorts.cbegin(); it != libBlock.outPorts.cend(); it++ )
    {
      if( !(block.isStateCopy && GraphBlock::Port::STATE != it->type) )
        le.registerVariable<int>( block.name + "/" + it->name );
    }
  }
  
  // setup the LogicEngine
  auto setupLogicEngine = [this]( std::vector<vertex_t>::const_reverse_iterator i, bool doInit )
  {
    auto &block = g[*i];
    auto &libBlock = libLookup( g[*i] );
    string implementation = g[*i].implementation;
    if( "" == implementation )
      implementation = libBlock.implementation;
    string init = g[*i].init;
    if( "" == init )
      init = libBlock.init;
    
   // find source of inPorts
    map<string, string> inPortTranslation;
    
    DirecetedGraph_t::in_edge_iterator begin, end;
    for( boost::tie(begin, end) = boost::in_edges( *i, g ); begin != end; begin++ )
    {
      auto source = g[ boost::source( *begin, g ) ];
      auto libSource = libLookup( source );
      inPortTranslation[ block.name + "/" + libBlock.inPorts[ g[*begin].toPort ].name ] = source.name + "/" + libSource.outPorts[ g[*begin].fromPort ].name;
    }
    stringstream impl( doInit ? init : implementation );
    le.import_noGrAF( impl, true, block.name + "/", inPortTranslation );
  };
  
  // Setup the normal logic afterwards
  for( auto i = topo_order.crbegin(); i != topo_order.crend(); ++i )
  {
    if( g[*i].isStateCopy )
      continue;
    
    setupLogicEngine( i, true );
  }
  le.markStartOfLogic();
  
  // Setup the state copies first
  for( auto i = topo_order.crbegin(); i != topo_order.crend(); ++i )
  {
    if( !g[*i].isStateCopy )
      continue;
    
    setupLogicEngine( i, false );
  }
  
  // Setup the normal logic afterwards
  for( auto i = topo_order.crbegin(); i != topo_order.crend(); ++i )
  {
    if( g[*i].isStateCopy )
      continue;
    
    setupLogicEngine( i, false );
  }
  
}

void Graph::dump( void ) const
{
  le.dump();
  logger << "\nInstruction dump:\n";
  logger << le.export_noGrAF();
  logger.show();
}

void Graph::grepBlock( istream& in )
{
  JSON::readJsonObject( in, [this]( istream& in1, const string& name ){
    blockLookup[ name ] = boost::add_vertex( g );
    GraphBlock& thisBlock = g[ blockLookup[ name ] ];
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
    if( !lib.hasElement( thisBlock.type ) )
    {
      throw( JSON::parseError( "Block of type '" + thisBlock.type + "' not found in library", in1 ) );
    }
    const GraphBlock &libBlock = libLookup( thisBlock );
    bool blockNotCopyied = true;
    for( auto p = libBlock.outPorts.cbegin(); p != libBlock.outPorts.cend(); ++p )
    {
      if( GraphBlock::Port::STATE == p->type )
      {
        if( blockNotCopyied )
        {
          blockLookup[ name + ".state" ] = boost::add_vertex( g );
          GraphBlock& stateBlock = g[ blockLookup[ name + ".state" ] ];
          stateBlock.name = name + ".state";
          stateBlock.isStateCopy = true;
          stateBlock.type = g[ blockLookup[ name ] ].type; //NOTE: thisBlock is invalid due to boost::add_vertex( g )
          stateBlock.implementation = " ";//"... copy state port ...";
          blockNotCopyied = false;
        } else {
          GraphBlock& stateBlock = g[ blockLookup[ name + ".state" ] ];
          stateBlock.implementation += " ";//"... copy other state port ...";
        }
      }
    }
  });
}

void Graph::grepSignal( istream& in )
{
  JSON::readJsonArray( in, [&]( istream& in1 ){
    int count = 0;
    string fromBlock, toBlock;
    int fromPort, toPort;
    JSON::readJsonArray( in1, [&]( istream& in2 ){
      switch( count++ )
      {
      case 0:
        fromBlock = JSON::readJsonString( in2 );
        break;
      case 1:
        in2 >> fromPort;
        break;
      case 2:
        toBlock = JSON::readJsonString( in2 );
        break;
      case 3:
        in2 >> toPort;
        break;
      case 4:
        JSON::readJsonObject( in2, []( istream& in3, const string& dummy ){
          in3.peek(); dummy.c_str(); // fix warning
        });
        break;
      default:
        throw( JSON::parseError( "Wrong number of entries in signals section!", in2 ) );
      }
    });
    
    // Reroute signal to the state duplicate if it's originating at a state port
    if( GraphBlock::Port::STATE == libLookup( fromBlock ).outPorts[fromPort].type )
      fromBlock += ".state";
    
    edge_t e1;
    bool ok;
    boost::tie( e1, ok ) = boost::add_edge( blockLookup[fromBlock], blockLookup[toBlock], g );
    g[e1].fromPort = fromPort;
    g[e1].toPort   = toPort;
  });
}

void Graph::parseString( istream& in )
{
  try
  {
    in >> JSON::consumeEmpty;
    JSON::readJsonObject( in, [this]( istream& in1, const string& section )
    {
      in1 >> JSON::consumeEmpty;
      if( "blocks" == section )
      {
        grepBlock( in1 );
      }
      else if( "signals" == section )
      {
        grepSignal( in1 );
      }
      else
        throw( JSON::parseError( "Bad file structure, only 'blocks' and 'signals' allowed!", in1 ) );
    } );
  }
  catch( JSON::parseError e )
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
  }
  catch( parseError e )
  {
    logger << "parseError: '" << e.text << "' at '" << e.pos << "'\n";
    logger.show();
  }
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
