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

#ifndef GRAPHBLOCK_HPP
#define GRAPHBLOCK_HPP

#include <array>
#include <vector>
#include <map>
#include <string>
#include <iostream>

#include "variabletype.hpp"

class Graph;

/**
 * 
 */
struct GraphBlock
{
  /**
   * Fill the GraphBlock from a JSON structure in the std::istream at @param in.
   */
  void readJsonBlock( std::istream& in );
  static void grepBlock( std::istream& in, Graph& graph );
  
  /**
   * Update the content of the Bloxk
   */
  struct Port
  {
    std::string name;
    enum portType {
      EVENT,
      STATE
    } type;
    
    void setType( const std::string& t );
    std::string getType( void ) const;
  };
  
  std::string name; // NOTE: only used for Graph - there it has to be kept in sync with blockLookup!
  std::string type; // NOTE: only used for Graph
  bool isStateCopy; // NOTE: only used for Graph
  int x;            // NOTE: only used for Graph
  int y;            // NOTE: only used for Graph
  int width;
  int height;
  int rotation;
  bool flip;
  std::array<double, 3> color;
  std::array<double, 3> background;
  std::vector<Port> inPorts;
  std::vector<Port> outPorts;
  std::map<std::string, variable_t> parameters;
  std::string init;
  std::string implementation;
};

std::ostream& operator<<( std::ostream &stream, const GraphBlock& block );

#endif // GRAPHBLOCK_HPP
