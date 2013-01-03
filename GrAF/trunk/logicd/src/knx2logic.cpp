/*
 *    Logic engine - KNX binding
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

#include <iostream>
#include <fstream>
#include <sstream>
#include <string>

#pragma GCC diagnostic push
#pragma GCC diagnostic ignored "-Weffc++"
#pragma GCC diagnostic ignored "-Wold-style-cast"
#include "zmq.hpp"
#pragma GCC diagnostic pop

#include "message.hpp"
#include "hexdump.hpp"
#include "knx.hpp"

using namespace std;
using namespace KNX;

void showHelp( void )
{
  cout << "Usage: knx2logic [options]" << endl
  << endl
  << "Connect KNX (via eibd) with the logic deamon." << endl
  << endl
  << "Parameters:" << endl
  << "    -n, --namespace [nsp]   Set namespace to use for messages" << endl
  << "    -h, --help              This help message" << endl
  << "    -u, --url [url]         Set connection URL for eibd" << endl
  << "    -g, --GAconf [url]      Set file for GA configuration" << endl
  << "    -v, --vebose            Verbose output - repeatable" << endl;
}

  
int main( int argc, char *argv[] )
{
  ///////////////////////////////////////////////////////////////////////////
  //
  //  Setup
  //
  string logicNamespace = "KNX";
  string knxURL = "ip:wiregate";
  string confGA = "/etc/wiregate/eibga.conf";
  
  for( int i = 1; i < argc; i++ )
  {
    string parameter( argv[ i ] );
    if     ( parameter == "-n" || parameter == "--namespace" )
    {
      if( ++i == argc )
      {
        cout << "Error: namespace not specified!" << endl;
        return -1;
      }
      logicNamespace = argv[ i ];
    }
    else if ( parameter == "-u" || parameter == "--url" ) 
    {
      if( ++i == argc )
      {
        cout << "Error: URL not specified!" << endl;
        return -1;
      }
      knxURL = argv[ i ];
    } 
    else if ( parameter == "-g" || parameter == "--GAconf" ) 
    {
      if( ++i == argc )
      {
        cout << "Error: path not specified!" << endl;
        return -1;
      }
      confGA = argv[ i ];
    } 
    else if ( parameter == "-h" || parameter == "--help" ) 
    {
      showHelp();
      return 0;
    }
  }
  
  // Setup KNX
  ConnectKNX knx( knxURL, confGA );
  if( EIBOpen_GroupSocket( knx.con, 0 ) == -1 )
  {
    cerr << "KNX opening failed" << endl;
    return -1;
  }

  // Setup ZMQ
  zmq::context_t context( 1 );
  zmq::socket_t subscriber( context, ZMQ_SUB );
  subscriber.connect("ipc:///tmp/logicd.messages.ipc");
  subscriber.setsockopt( ZMQ_SUBSCRIBE, logicNamespace.c_str(), logicNamespace.length() );
  zmq::socket_t sender( context, ZMQ_REQ );
  sender.connect( "ipc:///tmp/logicd.ipc" );
  
  zmq::pollitem_t items[2];
  items[0].socket = subscriber;          // the ZMQ
  items[0].events = ZMQ_POLLIN;
  items[1].socket = nullptr;             // the KNX
  items[1].fd = EIB_Poll_FD( knx.con );
  items[1].events = ZMQ_POLLIN;
    
  ///////////////////////////////////////////////////////////////////////////
  //
  //  Main loop
  //
  bool running = true;
  while( running ) 
  {
    // wait for next message or signal - infinitely long
    int pollRes = zmq_poll( items, 2, -1 );
    if( -1 == pollRes )  // Signal or Error
      running = false;
    
    if( items[0].revents ) // we recieced a ZMQ message
    {
      LogicMessage msg   = recieveMessage( subscriber );

      // prevent echo loops by ignoring all packets originating form our namespace
      if( logicNamespace + ":" == msg.getSource().substr( 0, logicNamespace.length()+1 ) )
        continue;

      string fullAddress = msg.getDestination();
      char type          = fullAddress[ logicNamespace.length() ];
      int knxAddr        = parseKNXAddr( fullAddress.substr( logicNamespace.length()+1 ) );

      if( -1 == knxAddr )
        continue;        // next iteration when address string is not valid

      eibaddr_t dest     = knxAddr;

      switch( type )
      {
        case ':': // write
          {
            const size_t buf_len = 15;
            uint8_t buf[ buf_len ];
            buf[ 0 ] = 0;
            //int len = knx.getDPT( dest ).setVariable( buf_len-1, buf+1, msg.getVariable() );
            //if( 0 == len )
            //{
            //  cerr << "Incompatible or unknown DPT! No value sent..." << endl;
            //  break;
            //}
            //if( EIBSendGroup( knx.con, dest, len+1, buf ) == -1 )
            if( buf_len+1 < msg.nativeSize() )
            {
              cerr << "Message size (" << msg.nativeSize() << ") too big!" << endl;
              break;
            }
            memcpy( buf+1, msg.getNative(), msg.nativeSize() );
            if( EIBSendGroup( knx.con, dest, msg.nativeSize()+1, buf ) == -1 )
            {
              cerr << "Sending write request failed!" << endl;
              break; // Request failed;
            }
          }
          break;
          
        case '<': // response
          cout << "send not implemented yet...\n";
          break;

        case '>': // read
          {
            uint8_t buf[2] = { 0, 0 };
            if( EIBSendGroup( knx.con, dest, 2, buf ) == -1 )
            {
              cerr << "Sending read request failed!" << endl;
              break; // Request failed;
            }
          }
          break;
          
        default:
          cerr << "Bad message - expected ':', '<' or '>' but found '" << type << "'" << endl;
      }
    } // end: if( items[0].revents )

    if ( items[1].revents ) // we recieced a KNX message
    {
      uint8_t buf[255];
      eibaddr_t src, dest;
      int len = EIBGetGroup_Src( knx.con, sizeof(buf), buf, &src, &dest );
      
      if( len == -1 )
      {
        cerr << "Read failed" << endl;
      } 
      else if( len < 2 )
      {
        cerr << "Invalid Packet" << endl;
      }
      else if( buf[0] & 0x3 || ( buf[1] & 0xC0 ) == 0xC0 )
      {
        cerr << "Unknown APDU from " << printKNXGroupAddr( src )
             << " to " << printKNXGroupAddr( dest ) 
             << ": " << hexdump( buf, len ) << endl;
      }
      else
      {
        uint8_t messageType = buf[1] & 0xC0;
        uint8_t *nativeBuf = buf + 1;
        size_t nativeLen = len - 1;
        if( len == 2 )
          nativeBuf[0] &= 0x3f;  // filter first (and only) byte
        else
          nativeBuf++;           // skip first byte
        
        switch( messageType )
        {
          case 0x00: // read
            {
              LogicMessage msg( logicNamespace + ">" + printKNXGroupAddr( dest ), 
                                logicNamespace + ":" + printKNXPhysicalAddr( src ),
                                knx.getDPT( dest ).getVariable( len, buf ),
                                nativeLen, nativeBuf );
              msg.send( sender );
              LogicMessage reply = recieveMessage( sender );
            }
            break;
            
          case 0x40: // response
            {
              LogicMessage msg( logicNamespace + "<" + printKNXGroupAddr( dest ), 
                                logicNamespace + ":" + printKNXPhysicalAddr( src ),
                                knx.getDPT( dest ).getVariable( len, buf ),
                                nativeLen, nativeBuf );
              msg.send( sender );
              LogicMessage reply = recieveMessage( sender );
            }
            break;
            
          case 0x80: // write
            {
              LogicMessage msg( logicNamespace + ":" + printKNXGroupAddr( dest ), 
                                logicNamespace + ":" + printKNXPhysicalAddr( src ),
                                knx.getDPT( dest ).getVariable( len, buf ),
                                nativeLen, nativeBuf );
              msg.send( sender );
              LogicMessage reply = recieveMessage( sender );
            }
            break;
        }
      }
    } // end: if ( items[1].revents )
  } // end: while( running )
  
  return 0;
}
