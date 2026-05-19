/////////////////////////////////////////////////////////////////////
//
// EPSON.H
//
//   General header file for EPSON Applications.
//
// Modification history
// ------------------------------------------------------------------
// 96-01-05 OPOS Release 1.0                                     Kata
// 96-04-25 OPOS Release 1.1; OPOS-J 1.0
// 96-07-08 DirectIO command for device specific details setting
//
/////////////////////////////////////////////////////////////////////

#if !defined(EPSON_H)
#define      EPSON_H

// * default numeric property on error *

const LONG PROP_ERRNUMBER = 0;

// * default string property on error *

const LPCTSTR PROP_ERRSTRING = _T("[Error]");


/////////////////////////////////////////////////////////////////////
// OPOS "ResultCodeExtended" Property Base Constants
/////////////////////////////////////////////////////////////////////

const LONG EPSNERREXT	= 10000;	// EPSON specific error base
const LONG CASHERREXT	= 20000;	// Cash Drawer specific error base
const LONG COINERREXT	= 30000;	// Coin Dispenser specific error base
const LONG TOTERREXT	= 40000;	// Hard Totals specific error base
const LONG LOCKERREXT	= 50000;	// Keylock specific error base
const LONG DISPERREXT	= 60000;	// Line Display specific error base
const LONG MICRERREXT	= 70000;	// MICR specific error base
const LONG MSRERREXT	= 80000;	// MSR specific error base
const LONG KBDERREXT	= 90000;	// POS Keyboard specific error base
const LONG PTRERREXT	= 100000;	// POS Printer specific error base
const LONG SCALERREXT	= 110000;	// Scale specific error base
const LONG SCANERREXT	= 120000;	// Scanner specific error base
const LONG SIGERREXT	= 130000;	// Signature Capture specific error base
const LONG CHKERREXT	= 140000;	// Check Scanner specific error base
const LONG EJERREXT		= 150000;	// Check Scanner specific error base
const LONG PORTERREXT	= 200000;	// CPortDrv error base
const LONG PARAMERREXT	= 300000;	// Parameter error base

/////////////////////////////////////////////////////////////////////
// "ResultCodeExtended" Property Constants (EPSON specific)
/////////////////////////////////////////////////////////////////////

const LONG OPOS_EX_BADCO				= 1 + EPSNERREXT;	// invalid CO I/F
const LONG OPOS_EX_BADPORT				= 2 + EPSNERREXT;	// invalid Port
const LONG OPOS_EX_BADDEVICE			= 3 + EPSNERREXT;	// invalid DeviceName
const LONG OPOS_EX_BADPROPIDX			= 4 + EPSNERREXT;	// invalid property index
const LONG OPOS_EX_BADPROPVAL			= 5 + EPSNERREXT;	// invalid property value
const LONG OPOS_EX_NOTSUPPORTED			= 6 + EPSNERREXT;	// function not supported
const LONG OPOS_EX_NOASB				= 7 + EPSNERREXT;	// no ASB data returned(Ver1.0 - Ver1.9)
const LONG OPOS_EX_NOINPUT				= 7 + EPSNERREXT;	// no input data returned (Ver2.0 -)
const LONG OPOS_EX_BUSY					= 8 + EPSNERREXT;	// Async Output busy
const LONG OPOS_EX_INCAPABLE			= 9 + EPSNERREXT;	// incapable of the function
const LONG OPOS_EX_INVALIDMODE			= 10 + EPSNERREXT;	// invalid device mode
const LONG OPOS_EX_REOPEN				= 11 + EPSNERREXT;	// re-open
const LONG OPOS_EX_BADPEEKRANGE			= 12 + EPSNERREXT;	// PeekRange invalid
const LONG OPOS_EX_BADDISPRANGE			= 13 + EPSNERREXT;	// DispatchRange invalid
const LONG OPOS_EX_NOTCLAIMED			= 14 + EPSNERREXT;	// Not claimed (Release method used)
const LONG OPOS_EX_TIMEOUT				= 15 + EPSNERREXT;	// sync output timeout
const LONG OPOS_EX_PORTUSED				= 16 + EPSNERREXT;	// Port used by another
const LONG OPOS_EX_PORTBUSY				= 17 + EPSNERREXT;	// HOST Port busy
const LONG OPOS_EX_MICRMODE				= 18 + EPSNERREXT;	// MICR mode
const LONG OPOS_EX_PORTLOCKED			= 18 + EPSNERREXT;	// Port locked by another
const LONG OPOS_EX_DEVBUSY				= 19 + EPSNERREXT;	// device busy
const LONG OPOS_EX_BADINF				= 20 + EPSNERREXT;	// invalid INF file
const LONG OPOS_EX_DISPOSE_ERROREVENT	= 21 + EPSNERREXT;	// Disporse Error Event
const LONG OPOS_EX_EXCEED_FILE_LIMIT	= 22 + EPSNERREXT;	// Exceed FilesSystem limit
const LONG OPOS_EX_UNAUTHORIZED			= 23 + EPSNERREXT;	// Unauthorized action
const LONG OPOS_EX_WAITING_REMOVAL		= 24 + EPSNERREXT;	// Waiting for slip/check removal

const LONG OPOS_EX_SOVERSION	= 100 + EPSNERREXT;	// invalid SO version

const LONG OPOS_EX_BADPARAM		= PARAMERREXT;		// invalid parameter (general)

const LONG OPOS_EFIRMWARE_WRITE_FAILED	= 30 + EPSNERREXT;		// Failed to download firmware to device

const LONG OPOS_EX_FAIL_MULTI_INTERFACE_PRINTING = 31 + EPSNERREXT;	// Failed the acquisition of the multi interface printing right.

/////////////////////////////////////////////////////////////////////
// DirectIO commands
/////////////////////////////////////////////////////////////////////

#endif                  // !defined(EPSON_H)

