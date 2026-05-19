/////////////////////////////////////////////////////////////////////
//
// EPSNDISP.H
//
//   Line Display header file for OPOS Applications.
//
// Modification history
// ------------------------------------------------------------------
// 95-11-29 OPOS Release 1.0                                     Kata
//
/////////////////////////////////////////////////////////////////////

#if !defined(EPSNDISP_H)
#define      EPSNDISP_H

#include "epson.h"

/////////////////////////////////////////////////////////////////////
// "ResultCodeExtended" Property Constants for Line Display
/////////////////////////////////////////////////////////////////////
const LONG OPOS_EDISP_TOOMANYWINDOWS	= 1 + DISPERREXT;	// 
const LONG OPOS_EDISP_TOOMANYDEFGLYPH	= 2 + DISPERREXT;	// 

/////////////////////////////////////////////////////////////////////
// DirectIO Method Constants
/////////////////////////////////////////////////////////////////////
// DirectIO Command
const LONG DISP_DI_SYNC				= 0;
const LONG DISP_DI_OUTPUT_NORMAL	= 1;
const LONG DISP_DI_GRAPHIC			= 2;
const LONG DISP_DI_SETIMAGE			= 3;
const LONG DISP_DI_GETMODE			= 4;
const LONG DISP_DI_SETFONT			= 5;
const LONG DISP_DI_GW_STYLE			= 6;
const LONG DISP_DI_OUTPUT			= DISP_DI_OUTPUT_NORMAL;
const LONG DISP_DI_FLASH_BITMAP		= 7;


// pData
const LONG DISP_DI_DUMMY			= 0;
const LONG DISP_DI_MODE_CHARACTER	= 1;
const LONG DISP_DI_MODE_GRAPHICS	= 2;
const LONG DISP_DI_FONT_A			= 10;
const LONG DISP_DI_FONT_B			= 11;
const LONG DISP_DI_GW_NORMAL		= 20;
const LONG DISP_DI_GW_TRANSPARENT	= 21;

#endif                  // !defined(EPSNDISP_H)

