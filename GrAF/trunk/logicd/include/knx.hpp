/*
 *    Logic engine - helper functions for KNX
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

#ifndef KNX_HPP
#define KNX_HPP

#include <string>
#include <map>

#include "variabletype.hpp"
#include "knx_dpt.hpp"

namespace KNX
{
  #include "eibclient.h"
  
  /**
   * Convert a string to a KNX address.
   * (Based on eibd code)
   */
  int32_t parseKNXAddr( const std::string& addr );
  
  /**
   * Convert a KNX group address (GA) to a string
   */
  std::string printKNXGroupAddr( const eibaddr_t& addr );
  
  /**
   * Convert a KNX physical address (PA) to a string
   */
  std::string printKNXPhysicalAddr( const eibaddr_t& addr );

  class GAconf
  {
    struct dbEntry
    {
      KNX::DPT dpt;
      std::string name;
    };
    typedef std::map< eibaddr_t, dbEntry > GAdb;
    GAdb db;

  public:
    GAconf( const std::string& file );

    std::string getName( const eibaddr_t& GA ) const
    {
      return db.at( GA ).name;
    }

    DPT getDPT( const eibaddr_t& GA ) const
    {
      return db.at( GA ).dpt;
    }
  };

  /**
   * Simple wrapper class for handling the eibd connection.
   * It offers RAII functionality.
   */
  struct ConnectKNX
  {
    EIBConnection *con;
    GAconf conf;

    ConnectKNX( const std::string& url, const std::string& GA )
      : con( EIBSocketURL( url.c_str() ) ),
        conf( GA )
    {}

    ~ConnectKNX()
    {
      if( con )
        EIBClose( con );
    }

    std::string getName( const eibaddr_t& GA ) const
    {
      return conf.getName( GA );
    }

    DPT getDPT( const eibaddr_t& GA ) const
    {
      return conf.getDPT( GA );
    }
  };

} // end: namespace KNX

#endif // KNX_HPP
