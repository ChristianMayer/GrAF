/*
 *    Logic engine
 *    Copyright (C) 2012  Christian Mayer <mail at ChristianMayer dot de>
 * 
 *    This program is free software: you can redistribute it and/or modify
 *    it under the terms of the GNU General Public License as published by
 *    the Free Software Foundation, either version 3 of the License, or
 *    (at your option) any later version.
 * 
 *    This program is distributed in the hope that it will be useful,
 *    but WITHOUT ANY WARRANTY; without even the implied warranty of
 *    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *    GNU General Public License for more details.
 * 
 *    You should have received a copy of the GNU General Public License
 *    along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

#include <string>
#include <iostream>
#include <sstream>

#include "zmq.hpp"

#include "message.hpp"

using namespace std;

void showHelp( void )
{
  cout << "Usage: send2logic address type value\n"
  "\n"
  "Send a message as defined by the parameters.\n"
  "\n"
  "Parameters:\n"
  "    address              The address (including namespace) to send to\n"
  "    type                 One of INT, FLOAT or STRING\n"
  "    value                The value to send (represented as a string)" << endl;
}

int main( int argc, const char *argv[] )
{
  if( argc != 4 )
  {
    showHelp();
    return 0;
  }

  string address( argv[1] );
  string type   ( argv[2] );
  
  // Prepare our context and socket
  zmq::context_t context( 1 );
  zmq::socket_t socket( context, ZMQ_REQ );
  
  socket.connect( "ipc:///tmp/logicd.ipc" );
  
  if( type == "INT" )
  {
    int value;
    istringstream istr( argv[3] );
    if( argv[3][0] == '0' && (argv[3][1] == 'x' || argv[3][1] == 'X') )
      istr >> hex;

    istr >> value;
    LogicMessage msg( address, value );
    msg.send( socket );
  } 
  else if( type == "FLOAT" )
  {
    float value;
    istringstream istr( argv[3] );
    istr >> value;
    LogicMessage msg( address, value );
    msg.send( socket );
  } 
  else if( type == "STRING" )
  {
    LogicMessage msg( address, argv[3] );
    msg.send( socket );
  } 
  else
  {
    cerr << "Unknown type '" << type << "' - should be INT, FLOAT or STRING" << endl;
    return -1;
  }
  
  // clean up - catch the reply
  LogicMessage reply = recieveMessage( socket );
  
  return 0;
}
