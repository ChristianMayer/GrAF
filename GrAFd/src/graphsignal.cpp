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

#include "graphsignal.hpp"

#include <iostream>

#include "graph.hpp"
#include "json.hpp"

void GraphSignal::grepSignal( std::istream& in, Graph& graph )
{
  JSON::readJsonArray( in, [&]( std::istream& in1 ){
    int count = 0;
    std::string fromBlock, toBlock;
    int fromPort, toPort;
    JSON::readJsonArray( in1, [&]( std::istream& in2 ){
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
          JSON::readJsonObject( in2, []( std::istream& in3, const std::string& dummy ){
            in3.peek(); dummy.c_str(); // fix warning
          });
          break;
        default:
          throw( JSON::parseError( "Wrong number of entries in signals section!", in2, __LINE__ ,__FILE__ ) );
      }
    });
  
  // Reroute signal to the state duplicate if it's originating at a state port
  if( GraphBlock::Port::STATE == graph.libLookup( fromBlock ).outPorts[fromPort].type )
    fromBlock += ".state";
  
  Graph::edge_t e1;
  bool ok;
  boost::tie( e1, ok ) = boost::add_edge( graph.blockLookup[fromBlock], graph.blockLookup[toBlock], graph.g );
  graph.g[e1].fromPort = fromPort;
  graph.g[e1].toPort   = toPort;
  });
}

std::ostream& operator<<( std::ostream &stream, const GraphSignal& signal )
{
  stream << "  [";
  stream <<         signal.fromPort  <<   ", ";
  stream <<         signal.toPort    <<   ", ";
  stream << "{"  << signal.optional  << "}";
  stream << "]";
  return stream;
}

std::ostream& operator<<( std::ostream &stream, const GraphSignalExtended& signal )
{
  stream << "    [";
  stream << "\"" << signal.from      << "\", ";
  stream <<         signal.fromPort  <<   ", ";
  stream << "\"" << signal.to        << "\", "; 
  stream <<         signal.toPort    <<   ", ";
  stream << "{"  << signal.optional  << "}";
  stream << "]";
  return stream;
}
