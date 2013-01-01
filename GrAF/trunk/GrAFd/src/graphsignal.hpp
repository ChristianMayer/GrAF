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

#ifndef GRAPHSIGNAL_HPP
#define GRAPHSIGNAL_HPP

#include <string>
#include <iosfwd>

class Graph;
struct GraphSignalExtended;

/**
 * Hold all the information of a GrAF Signal.
 * Note: the fromBlock and toBlock are stored implicitly in the graph itself
 */
struct GraphSignal
{
  int fromPort;         ///< The Block port where the singal originates
  int toPort;           ///< The Block port where the signal ends
  std::string optional; ///< Optional informations about the signal
  
  /**
   * Read a GraphSignal from @p in and insert it in the @p graph.
   */
  static void grepSignal( std::istream& in, Graph& graph );
  
  GraphSignalExtended extend( const std::string& from, const std::string& to ) const;
};

struct GraphSignalExtended : public GraphSignal
{
  std::string from;
  std::string to;
  
  GraphSignalExtended( const GraphSignal& gs, const std::string& f, const std::string& t ) :
    GraphSignal( gs ),
    from( f ),
    to( t )
  {}
};

std::ostream& operator<<( std::ostream &stream, const GraphSignal& signal );
std::ostream& operator<<( std::ostream &stream, const GraphSignalExtended& signal );

inline GraphSignalExtended GraphSignal::extend( const std::string& from, const std::string& to ) const
{
  return GraphSignalExtended( *this, from, to );
}

#endif // GRAPHSIGNAL_HPP
