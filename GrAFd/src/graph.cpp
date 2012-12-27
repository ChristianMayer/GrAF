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

#include "graph.hpp"

#include <string>

#include "json.hpp"
#include "logger.hpp"

using namespace std;

GraphLib Graph::lib; // give the static variable a home

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
        GraphBlock::grepBlock( in1, *this );
      }
      else if( "signals" == section )
      {
        GraphSignal::grepSignal( in1, *this );
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
}

