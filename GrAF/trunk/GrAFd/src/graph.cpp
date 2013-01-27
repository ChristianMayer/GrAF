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
#include <boost/algorithm/string/predicate.hpp>

#include "globals.h"
#include "utilities.hpp"

#include "json.hpp"
#include "logger.hpp"
#include "messageregister.hpp"
#include "worker.hpp"

using namespace std;

GraphLib Graph::lib; // give the static variable a home

Graph::Graph( istream& stream )
: meta({
    { "step-size",  0.0 },
    { "stop-time", -1.0 },
  }),
  scheduler( nullptr )
{
  parseString( stream );
  
  std::vector<vertex_t> topo_order;
  boost::topological_sort(g, std::back_inserter(topo_order));
  
  // count the needed instructions for this logic
  size_t instructions = 0;
  for( auto i = topo_order.crbegin(); i != topo_order.crend(); ++i )
  {
    auto &block = g[*i];
    auto &libBlock = libLookup( block );
    
    if( block.isStateCopy )
    {
      instructions += LogicEngine::instructionsCount( libBlock.implementation );
      continue;
    }
    
    instructions += LogicEngine::instructionsCount( libBlock.init );
    instructions += LogicEngine::instructionsCount( libBlock.implementation );
  }
  
  logicengines.emplace_back( instructions );
  
  le = &(logicengines.back()); //new LogicEngine( instructions, -1 );
  le->registerVariable<float>( "__dt" );
  map<string, string> parameterTranslation;
  
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
        if( variableType::STRING == it->second.getType() )
        { 
          auto p = libBlock.parameters.find( it->first );
          if( libBlock.parameters.end() == p )
            throw JSON::parseError( "Parameter '" + it->first + "' not found!", __LINE__ ,__FILE__ );
          
          if( variableType::STRING != p->second.getType() )
          {
            if( "__dt" == it->second.getString() )
            {
              parameterTranslation[ block.name + "/" + it->first ] = "__dt";
              logger << "map '" << (block.name + "/" + it->first) << "' to __dt\n"; logger.show();
            } else
              throw JSON::parseError( "String parameter for number value only for '__dt' implemented!", __LINE__ ,__FILE__ );
          } else {
            logger << "##### '" << (block.name + "/" + it->first) << "' - '" << it->second.getAsString() << "'\n"; logger.show();
            //le->registerVariable( block.name + "/" + it->first, it->second );
            parameterTranslation[ block.name + "/" + it->first ] = it->second.getAsString();
          }
        } else
          le->registerVariable( block.name + "/" + it->first, it->second );
      }
    }
    
    // register outPorts
    for( auto it = libBlock.outPorts.cbegin(); it != libBlock.outPorts.cend(); it++ )
    {
      if( !(block.isStateCopy && GraphBlock::Port::STATE != it->type) )
        le->registerVariable<int>( block.name + "/" + it->name );
    }
  }
  
  // setup the LogicEngine
  auto setupLogicEngine = [this, &parameterTranslation]( std::vector<vertex_t>::const_reverse_iterator i, bool doInit )
  {
    const auto &block = g[*i];
    const auto &libBlock = libLookup( block );
    string implementation = block.implementation;
    if( "" == implementation )
      implementation = libBlock.implementation;
    string init = block.init;
    if( "" == init )
      init = libBlock.init;
    
    // find source of inPorts
    map<string, string> inPortTranslation( parameterTranslation );
    
    DirecetedGraph_t::in_edge_iterator begin, end;
    for( boost::tie(begin, end) = boost::in_edges( *i, g ); begin != end; begin++ )
    {
      const auto& source = g[ boost::source( *begin, g ) ];
      const auto& libSource = libLookup( source );
      inPortTranslation[ block.name + "/" + libBlock.inPorts.at( g[*begin].toPort ).name ] = source.name + "/" + libSource.outPorts.at( g[*begin].fromPort ).name;
    }
    stringstream impl( doInit ? init : implementation );
    le->import_noGrAF( impl, true, block.name + "/", inPortTranslation );
  };
  
  // Setup the normal logic initialization
  for( auto i = topo_order.crbegin(); i != topo_order.crend(); ++i )
  {
    if( g[*i].isStateCopy )
      continue;
    
    setupLogicEngine( i, true );
  }
  le->markStartOfLogic();
  
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
  
  bool prepareLE = le->enableVariables() && le->startLogic();
  ASSERT_MSG( prepareLE, "ERROR: couldn't set state to run LogicEngine init!" );
 logger << le->export_noGrAF() << "\n";logger.show(); // FIXME delete
 le->dump();// FIXME delete
  le->run_init();
  
  bool finishLE = le->stopLogic();
  ASSERT_MSG( finishLE, "ERROR: couldn't set state to Stop after LogicEngine init!" );
}

Graph::~Graph()
{ 
  //if( nullptr != le )
  //  delete le;
  if( nullptr != scheduler )
  {
    delete scheduler;
  }
}

Graph::Graph( Graph&& other )
: g( std::move( other.g ) ),
  blockLookup( std::move( blockLookup ) ),
  meta( std::move( other.meta ) ),
  logicengines( std::move( other.logicengines ) ),
  scheduler( nullptr )
  //le( nullptr )
{
  //std::swap( le, other.le );
  le = &(logicengines.back());
  //std::swap( scheduler, other.scheduler );
  if( nullptr != other.scheduler )
  {
    other.scheduler->cancel();
    //logger << "Starting schedule in " << this << " Move from "<< &other <<"\n"; logger.show();
    schedule( other.scheduler->get_io_service() );
    //scheduler->get_io_service().poll();
    //delete other.scheduler;
    //other.scheduler = 0;
  }
}

void Graph::init( boost::asio::io_service& io_service )
{
  logger << "Init Graph " << this << "\n"; logger.show();
  schedule( io_service );
}

void Graph::dump( void ) const
{
  le->dump();
  logger << "\nInstruction dump:\n";
  logger << le->export_noGrAF();
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
      if( "meta" == section )
      {
        grepMeta( in1 );
      }
      else if( "blocks" == section )
      {
        GraphBlock::grepBlock( in1, *this );
      }
      else if( "signals" == section )
      {
        GraphSignal::grepSignal( in1, *this );
      }
      else
        throw( JSON::parseError( "Bad file structure, only 'blocks' and 'signals' allowed!", in1, __LINE__ ,__FILE__ ) );
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

void Graph::grepMeta( istream& in )
{
  JSON::readJsonObject( in, [this]( istream& in1, const string& name ){
    auto entry = meta.find( name );
    if( meta.end() == entry )
      throw JSON::parseError( "Meta entry '" + name + "' not known!", in1, __LINE__ ,__FILE__ );
    
    switch( JSON::identifyNext( in1 ) )
    {
      case JSON::BOOL:
        entry->second = JSON::readJsonBool( in1 );
        break;
        
      case JSON::NUMBER:
        switch( entry->second.getType() )
        {
          case variableType::INT:
            {
              int value;
              in1 >> value;
              entry->second = variable_t( value );
            }
            break;
            
          case variableType::FLOAT:
            {
              float value;
              in1 >> value;
              entry->second = variable_t( value );
            }
            break;
            
          default:
            throw JSON::parseError( "Meta entry '" + name + "' - number not expected!", in1, __LINE__ ,__FILE__ );
        }
        break;
        
      case JSON::STRING:
        entry->second = JSON::readJsonString( in1 );
        break;
        
      default:
        throw JSON::parseError( "Meta entry '" + name + "' has unsupported type!", in1, __LINE__ ,__FILE__ );
    };
  });
}

void handle_schedule_call( const boost::system::error_code& error, const Graph* graph )
{
  logger << "TIME - LE called, error: '" << error << "' = '"<< error.message() <<"'; scheduler: "<< graph->scheduler<< "\n"; logger.show();
  
  if( boost::asio::error::operation_aborted == error )
    return;

  bool prepareLE = graph->le->enableVariables(); //startLogic()
  ASSERT_MSG( prepareLE, "Couldn't set LogicEngine state from STOPPED to COPIED (is: " << LogicEngine::logicStateName[graph->le->getState()] << ")" );
  
  worker->enque_task( graph->le );
  
  // schedule next run
  if( nullptr != graph->scheduler )
  {
    graph->scheduler->expires_at( graph->scheduler->expires_at() + graph->duration );
    graph->scheduler->async_wait( bind( handle_schedule_call, placeholders::_1, graph ) );
  }
}

void Graph::schedule( boost::asio::io_service& io_service )
{
  auto step_size = meta.at( "step-size" ).getFloat();
  if( 0.0 < step_size )
  {
    logger << "Register LE "<<le<<" with cycle time of " << step_size << " (scheduler: "<<scheduler<<") in Graph "<<this<<"\n"; logger.show();
    
    duration = std::chrono::duration_cast<scheduler_t::duration>( chrono::duration<float, ratio<1>>{ step_size } );
    scheduler = new scheduler_t( io_service, duration );
    scheduler->async_wait( bind( handle_schedule_call, placeholders::_1, this ) );
  }
}

std::ostream& operator<<( std::ostream &stream, Graph& graph )
{
  stream << "{\n  \"blocks\": {\n";

  Graph::DirecetedGraph_t::vertex_iterator vi, vi_end;
  boost::tie( vi, vi_end ) = boost::vertices( graph.g );
  bool cont = (vi != vi_end);
  while( cont )
  {
    auto thisGraph = graph.g[ *vi ];
    cont = (++vi != vi_end);
    if( thisGraph.isStateCopy )
      continue;
    stream << thisGraph.show( true, cont );
  }

  stream << "  },\n  \"signals\": [\n";

  Graph::DirecetedGraph_t::edge_iterator ei, ei_end;
  boost::tie( ei, ei_end ) = boost::edges( graph.g );
  cont = (ei != ei_end);
  while( cont )
  {
    auto thisEdge = graph.g[ *ei ];
    
    string from = graph.g[ boost::source( *ei, graph.g ) ].name;
    if( boost::algorithm::ends_with( from, ".state") )
      from = from.substr( 0, from.length() - 6 );
    string to   = graph.g[ boost::target( *ei, graph.g ) ].name;
    cont = (++ei != ei_end);
    stream << thisEdge.extend( from, to );
    if( cont )
      stream << ",\n";
  }
    //Graph::DirecetedGraph_t::  in_edge_iterator begin, end;
  //for( boost::tie(begin, end) = boost::in_edges( *i, g ); begin != end; begin++ )

  return stream << "\n  ]\n}\n";
}
