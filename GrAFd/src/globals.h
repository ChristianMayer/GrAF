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

#ifndef GLOBALS_H
#define GLOBALS_H

#include <cstddef>

#include <config.h>

#include <map>
#include <boost/concept_check.hpp>
//#include "message.hpp"

#pragma GCC diagnostic push
#pragma GCC diagnostic ignored "-Weffc++"
#pragma GCC diagnostic ignored "-Wold-style-cast"
#include "zmq.hpp"
#pragma GCC diagnostic pop

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
extern class Worker* worker;

#endif // CONFIGHANDLER