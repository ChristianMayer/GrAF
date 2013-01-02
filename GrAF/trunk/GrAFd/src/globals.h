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

#ifndef GLOBALS_H
#define GLOBALS_H

#include <cstddef>

#include <config.h>

#include <map>
//#include "message.hpp"
#include "zmq.hpp"
//#include "graph.hpp"

// macros

// Global definitions
typedef unsigned char raw_t;
typedef ptrdiff_t     raw_offset_t;
typedef std::map<std::string, class Graph> graphs_t;

// Global objects
extern class MessageRegister registry;
extern zmq::socket_t* sender;
extern graphs_t graphs;

#endif // CONFIGHANDLER