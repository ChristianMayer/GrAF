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

#ifndef GRAPH_HPP
#define GRAPH_HPP

#include <vector>
#include <string>
#include <map>
#include <istream>
#include <chrono>

#include <boost/asio.hpp>
#include "boost/graph/adjacency_list.hpp"
#include "boost/graph/topological_sort.hpp"

#include "logger.hpp"
#include "graphblock.hpp"
#include "graphsignal.hpp"
#include "graphlib.hpp"
#include "logicengine.hpp"

/**
 * The Graph class holds one full logic graph.
 * It allows manipulation as well as deriving the logic from it.
 */
class Graph
{
public:
  /**
   * Constructor - logicEngine from the stream.
   * 
   * @param stream      An istream from which the Graph is extracted
   */
  Graph( std::istream& stream );
  
  /**
   * Destructor.
   */
  ~Graph();
  
  Graph( const Graph& ) = delete; // no copy
  Graph( Graph&& other );         // but move
  
  /**
   * Run the initialisation and set up the periodic calls.
   */
  void init( boost::asio::io_service& io_service );
  
  /**
   * Show the content of the graph.
   */
  void dump( void ) const;
  
  /**
   * The library of all known GraphBlock elements.
   */
  static GraphLib lib;
  
  /**
   * Type of the used graph.
   */
  typedef boost::adjacency_list<boost::vecS, boost::vecS, boost::bidirectionalS, GraphBlock, GraphSignal> DirecetedGraph_t;
  /**
   * Type of a descriptor of a vertex (so it's like a index to a vertex).
   */
  typedef DirecetedGraph_t::vertex_descriptor vertex_t;
  /**
   * Type of a descriptor of a edge (so it's like a index to an edge).
   */
  typedef DirecetedGraph_t::edge_descriptor edge_t;
  
private:
  friend GraphBlock;
  friend GraphSignal;
  friend std::ostream& operator<<( std::ostream &stream, Graph& graph );
  
  /**
   * Type of a look up table of a vertex, also a GraphBlock, for a given name.
   */
  typedef std::map<std::string, vertex_t> blockLookup_t;
  
  /**
   * The graph structure of this Graph.
   */
  DirecetedGraph_t g;
  /**
   * Look up table of a vertex, also a GraphBlock, for a given name.
   * NOTE: has to be kept in sync with Block.name!
   */
  blockLookup_t blockLookup;
  
  void parseString( std::istream& in );
  void grepMeta( std::istream& in );
  
  std::map<std::string, variable_t> meta;
  
  const GraphBlock& libLookup( const GraphBlock& source ) const 
  {
    return lib[ source.type ];
  }
  
  const GraphBlock& libLookup( const std::string& source ) const 
  {
    return libLookup( g[ blockLookup.at( source ) ] );
  }
  
  typedef std::vector<class LogicEngine> logicengines_t;
  logicengines_t logicengines;

  typedef boost::asio::basic_waitable_timer< std::chrono::steady_clock > scheduler_t;
  scheduler_t::duration duration;
  scheduler_t* scheduler;
  void schedule( boost::asio::io_service& io_service );
  friend void handle_schedule_call( const boost::system::error_code& error, const Graph* graph );
public: // TODO only a temporary solution...
  class LogicEngine* le;
};

std::ostream& operator<<( std::ostream &stream, Graph& graph );

#endif // GRAPH_HPP