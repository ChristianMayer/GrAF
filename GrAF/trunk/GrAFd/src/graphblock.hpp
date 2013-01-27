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
#include <boost/concept_check.hpp>

#include "variabletype.hpp"

class Graph;

/**
 * One block in the GrAF graph.
 */
struct GraphBlock
{
  /**
   * Fill the GraphBlock from a JSON structure in the std::istream at @p in - used for library.
   */
  void readJsonBlock( std::istream& in, const std::string& blockName );
  /**
   * Read a GraphBlock from @p in and insert it in the @p graph - used for logic.
   */
  static void grepBlock( std::istream& in, Graph& graph );
  
  const GraphBlock& show( bool asLogic, bool cont )
  {
    showAsLogic = asLogic;
    showContinue = cont;
    return *this;
  }
  
  /**
   * Information about a Port of the block.
   */
  struct Port
  {
    /**
     * The name of the port.
     */
    std::string name;
    /**
     * The possible port types.
     */
    enum portType {
      CONTINUOUS,
      EVENT,
      STATE
    } type; ///< The type of the port.
    
    /**
     * Set the type of the port.
     */
    void setType( const std::string& t );
    /**
     * Return a string describing the type of the port.
     */
    std::string getType( void ) const;
  };
  
  std::string name; ///< Name of the block, NOTE: only used for Graph - there it has to be kept in sync with blockLookup!
  std::string type; ///< Type of the block, NOTE: only used for Graph
  bool isStateCopy; ///< Is the block a copy due to a state, NOTE: only used for Graph
  int x;            ///< x position of the block, NOTE: only used for Graph
  int y;            ///< y position of the block, NOTE: only used for Graph
  int width;        ///< width of the block
  int height;       ///< height of the block
  int rotation;     ///< rotation of the block
  bool flip;        ///< is the block flipped?
  std::array<double, 3> color;      ///< color of the block
  std::array<double, 3> background; ///< background color of the block
  std::vector<Port> inPorts;        ///< inPorts of the block
  std::vector<Port> outPorts;       ///< outPorts of the block
  std::map<std::string, variable_t> parameters; ///< parameters of the block
  std::string init;                 ///< Init task instructions of the block
  std::string implementation;       ///< Main taks instructions of the block
  
  bool showAsLogic;
  bool showContinue;
};

std::ostream& operator<<( std::ostream &stream, const GraphBlock& block );

#endif // GRAPHBLOCK_HPP
