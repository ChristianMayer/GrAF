/*
 < one line to give t*he program's name and a brief idea of what it does.>
 Copyright (C) 2012  Christian Mayer <email>
 
 This program is free software: you can redistribute it and/or modify
 it under the terms of the GNU General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.
 
 This program is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU General Public License for more details.
 
 You should have received a copy of the GNU General Public License
 along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

#ifndef GLOBALS_H
#define GLOBALS_H

#include <cstddef>

#include <config.h>

#include "logger.hpp"
#include "message.hpp"

#include "messageregister.hpp"

// macros

// Global definitions
typedef unsigned char raw_t;
typedef ptrdiff_t     raw_offset_t;

// Global objects
//extern raw globVar[];
extern Logger logger;
extern MessageRegister registry;
extern zmq::socket_t* sender;

#endif // CONFIGHANDLER