/*
    <one line to give the program's name and a brief idea of what it does.>
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


#ifndef MESSAGE_H
#define MESSAGE_H

#include <stdint.h>
#include <sys/time.h>

class Message
{
public:
  enum dataType {
    INTEGER,
    FLOAT,
    TIME,
    DATE,
    DATETIME,
    STRING
  };
  enum { 
    messageSize = 512,
    fixedSegmentLength =
      sizeof( timeval  ) + // message_created
      sizeof( timeval  ) + // message_distributed
      sizeof( uint32_t ) + // source
      sizeof( uint32_t ) + // target
      sizeof( uint16_t ) + // data_type
      sizeof( uint16_t ) + // length_path
      sizeof( uint16_t ) + // length_data
      sizeof( uint16_t ) + // length_data_raw
      0, // dummy, just here to ease coding
    dataLength  = messageSize - fixedSegmentLength
  };
  
private:
  timeval  message_created;
  timeval  message_distributed;
  uint32_t source;
  uint32_t target;
  uint16_t data_type;       // will be casted to dataType
  uint16_t length_path;
  uint16_t length_data;
  uint16_t length_data_raw;
  char data[dataLength];
};

#endif // MESSAGE_H
