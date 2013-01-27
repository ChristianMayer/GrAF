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

#ifndef LOGICELEMENT_DUMP_HPP
#define LOGICELEMENT_DUMP_HPP

#include "logicelement_generic.hpp"

//#include "../logicengine.h"

class LogicEngine;

/**
 * A LogicElement that will dump the current LogicEngine - only for debugging.
 */
class LogicElement_Dump : LogicElement_Generic
{
  const LogicEngine& le;
  
public:
  /**
   * Constructor.
   */
  LogicElement_Dump( const LogicEngine& _le ) : le( _le )
  {}
  
  /**
   * Signature.
   */
  const static signature_t signature;
  
  /**
   * Factory
   */
  /* FIXME
  static LogicElement_Generic* create() 
  { 
    return new LogicElement_Dump( le ); 
  }
  */
  
  /**
   * Do the real work
   */
  void calc( raw_t*const base ) const
  {
    le.dump();
    ++reinterpret_cast<iterator*>( base )[0]; // increase instruction pointer
  }
};

#endif // LOGICELEMENT_DUMP_HPP
