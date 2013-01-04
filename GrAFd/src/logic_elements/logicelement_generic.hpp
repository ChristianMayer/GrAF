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

#ifndef LOGICELEMENT_GENERIC_HPP
#define LOGICELEMENT_GENERIC_HPP

#include <vector>
#include <string>

#include "../globals.h"

#include "variabletype.hpp"

/**
 * The base class of all LogicElements defining the interface.
 */
class LogicElement_Generic
{
public:
  /**
   * Type of an iterator though a list of LogicElements.
   */
  typedef LogicElement_Generic** iterator;
  /**
   * Type of an const iterator though a list of LogicElements.
   */
  typedef const iterator const_iterator;
  
  enum parameter_t {
    OFFSET,
    VARIABLE_T
  };
  /**
   * 
   */
  typedef std::vector<parameter_t> signature_t;
  
  /**
   * Type of parameters for creating a LogicElement though the factory.
   */
  typedef std::vector<std::string> params_t;
  /**
   * Type of the factory function to create a LogicElement
   */
  typedef LogicElement_Generic* (*FactoryType)( const params_t& );
  
  /**
   * Global valid position of "ground", a variable that will allways be
   * zero and might be used as a fall back for undefined entries.
   */
  static const raw_offset_t ground = sizeof( LogicElement_Generic* );
  
  /**
   * Destructor - virtual to allow overloading.
   */
  virtual ~LogicElement_Generic() {}
  
  /**
   * Do the real work - must be implemented
   */
  virtual void calc( raw_t* const base ) const = 0;
  
  /**
   * Export the content in noGrAF format - should be overloaded.
   */
  virtual void dump( std::ostream& out ) const { out << "<unknown element>" << std::endl; }
};

#endif // LOGICELEMENT_GENERIC_HPP
