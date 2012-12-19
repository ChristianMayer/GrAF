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

#ifndef GRAPHBLOCK_H
#define GRAPHBLOCK_H

#include <array>
#include <vector>
#include <map>
#include <string>
#include <iostream>

#include "variabletype.hpp"

/**
 * 
 */
struct GraphBlock
{
  void readJsonBlock( std::istream& in );
  
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
  
  /*
  struct Parameter
  {
    std::string type;
    std::string defaultValue;
  };
  */
  int width;
  int height;
  int rotation;
  bool flip;
  std::array<double, 3> color;
  std::array<double, 3> background;
  std::vector<Port> inPorts;
  std::vector<Port> outPorts;
  //std::map<std::string, Parameter> parameters;
  std::map<std::string, variable_t> parameters;
};

std::ostream& operator<<( std::ostream &stream, const GraphBlock& block );

#endif // GRAPHBLOCK_H
