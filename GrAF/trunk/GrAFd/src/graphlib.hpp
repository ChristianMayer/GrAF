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

#ifndef GRAPHLIB_HPP
#define GRAPHLIB_HPP

#include <string>
#include <map>

#include "graphblock.hpp"

/**
 * The class to hold a library of known GraphBlock elements.
 */
class GraphLib
{
public:
  /**
   * Constructor.
   */
  GraphLib() : lib() {}
  
  /**
   * Add a path and scan it for .graflib files.
   * @returns true when @param path was added (i.e. a directory).
   */
  bool addPath( const std::string& path );
  
  /**
   * Add the content of the @param file to the library.
   */
  void addSource( const std::string& file );
  
  /**
   * Look up the GraphBlock for the given key.
   */
  const GraphBlock& operator[]( const std::string& key ) const
  {
    return lib.at( key );
  }
  
  /**
   * Look up if the GraphBlock for the given key is in the library.
   */
  bool hasElement( const std::string& key ) const
  {
    return lib.count( key ) == 1;
  }
  
private:
  /**
   * The library of all known Blocks.
   */
  std::map<std::string, GraphBlock> lib;
  
  friend std::ostream& operator<<( std::ostream &stream, const GraphLib& lib );
};

std::ostream& operator<<( std::ostream &stream, const GraphLib& lib );

#endif // GRAPHLIB_HPP
