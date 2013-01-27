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

#ifndef MESSAGEREGISTER_HPP
#define MESSAGEREGISTER_HPP

#include <map>
#include <string>
#include <vector>
#include <chrono>

#include "globals.h"

#include "variabletype.hpp"

#include "graph.hpp"

/*
static const char *message_status_string[3] = 
{ 
  "INVALID_MSG",
  "OLD_MSG",
  "NEW_MSG"
};
*/

/**
 * Register all message addresses of interest and the logic IDs that should be
 * called when such a message arrives.
 */
class MessageRegister
{
  //typedef void (*messageHandler_Callback_t)(variable_t);
  typedef std::function<void (variable_t)> messageHandler_Callback_t;
  typedef std::vector<std::pair<class LogicEngine* const, messageHandler_Callback_t>> subscribers_t;
public:
  typedef subscribers_t::value_type MessageRegisterSubscribers_t;
  /**
   * Type of a timestamp.
   */
  typedef std::chrono::time_point<std::chrono::system_clock> timestamp_t;
  /**
   * @return current timestamp
   */
  static timestamp_t now( void ) { return timestamp_t::clock().now(); }
  
private:
  struct register_t
  {
    variable_t    value;
    timestamp_t   timestamp;
    subscribers_t subscribers;
  };
  struct key {
    variableType::type type;
    std::string        address;
    key( variableType::type t, const std::string& a ) : type(t), address(a) {}
    bool operator<(const key& other) const 
    { 
      return type < other.type || (type == other.type && address < other.address); 
    }
  };
  typedef std::map<key, register_t> map_t;
public:
  /**
   * Enumeration of possible states of the messages.
   */
  enum message_status : uint8_t
  {
    INVALID_MSG,
    OLD_MSG,
    NEW_MSG
  };
  
  // MessageRegister();
  
  /**
   * Stores an address that should be available to recieve later.
   * @returns an iterator to the element created
   */
  map_t::iterator look_for( const std::string& dst, const variableType::type type )
  {
    // will do nothing if key is already existing
    return registry.insert( std::pair<key, register_t>( key(type, dst), register_t() ) ).first;
  }
  
  /**
   * Stores a logic ID that will be called once the address arrives
   */
  void subscribe( const std::string& dst, const variableType::type type, const subscribers_t::value_type& logic_ID )
  {
    look_for( dst, type )->second.subscribers.push_back( logic_ID );
  }
  
  /**
   * Update registry with a new value.
   * @returns a const_iterator to the enty.
   */
  map_t::const_iterator update( const std::string& dst, const variable_t& v )
  {
    map_t::iterator entry = registry.find( key(v.getType(),dst) );
    
    if( entry != registry.end() )
    {
      entry->second.value     = v;
      entry->second.timestamp = timestamp_t::clock().now();
    }
    
    return entry;
  }
  
  /**
   * Check if an iterator is valid.
   */
  bool is_valid( map_t::const_iterator it ) const
  {
    return it != registry.end();
  }
  
  /**
   * Copy value.
   * @return Status of the message.
   */
  message_status copy_value( const std::string& dst, const variableType::type type, void* target, const timestamp_t& timestamp ) const
  {
    map_t::const_iterator it = registry.find( key(type,dst) );
    
    if( it->second.value.getType() != type )
      return INVALID_MSG;
    
    switch( type )
    {
      case variableType::INT:
        *reinterpret_cast<int*>(target) = it->second.value.getInt();
        break;
        
      case variableType::FLOAT:
        *reinterpret_cast<float*>(target) = it->second.value.getFloat();
        break;
        
      case variableType::STRING:
        // TODO: unsupported at the moment...
      case variableType::UNKNOWN:
      default:
        break;
    }

    return timestamp > it->second.timestamp ? OLD_MSG : NEW_MSG;
  }

private:
  map_t registry;
};

#endif // MESSAGEREGISTER_HPP
