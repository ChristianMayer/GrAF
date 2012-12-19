/*
 * < one line to give the *program's name and a brief idea of what it does.>
 * Copyright (C) 2012  Christian Mayer <email>
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

#ifndef GRAPH_H
#define GRAPH_H

#include <vector>
#include <string>
#include <map>
#include <istream>

#include "boost/graph/adjacency_list.hpp"
#include "boost/graph/topological_sort.hpp"

#include "globals.h"

#include "logger.hpp"
#include "graphlib.hpp"
#include "variabletype.hpp"

/**
 * The Graph class holds one full logic graph.
 * It allows manipulation as well as deriving the logic from it.
 */
class Graph
{
public:
  /**
   * Hold all the information of a GrAF Block.
   */
  struct Block
  {
    //typedef std::map<std::string, std::string> parameters_t;
    typedef std::map<std::string, variable_t> parameters_t;
    std::string name; // NOTE: has to be kept in sync with blockLookup!
    std::string type;
    double x;
    double y;
    double width;
    double height;
    bool flip;
    parameters_t parameters;
  };

  /**
   * Hold all the information of a GrAF Signal.
   */
  struct Signal
  {
    //blockContainer_t::const_iterator first;
    int    fromPort;
    //blockContainer_t::const_iterator second;
    int    toPort;
    std::string optional;
  };

  Graph( const char* string );
  
  struct parseError
  {
    std::string text;
    const char *pos;
    
    parseError( const std::string& t, const char* p ) : text( t ), pos( p ) {}
  };
  
  static GraphLib lib;
private:
  typedef boost::adjacency_list< boost::vecS, boost::vecS, boost::directedS, Block, Signal > DirecetedGraph_t;
  typedef DirecetedGraph_t::vertex_descriptor vertex_t;
  typedef DirecetedGraph_t::edge_descriptor edge_t;
  
  typedef std::map<std::string, vertex_t> blockLookup_t;
  
  DirecetedGraph_t g;
  blockLookup_t blockLookup; // NOTE: has to be kept in sync with Block.name!
  
  void parseString( std::istream& in );
  void grepBlock( std::istream& in );
  void grepSignal( std::istream& in );
};

std::ostream& operator<<( std::ostream &stream, const Graph::Block& block );
std::ostream& operator<<( std::ostream &stream, const Graph::Signal& signal );

#endif // GRAPH_H