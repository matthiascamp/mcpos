/////////////////////////////////////////////////////////////////////
//
// EPSNPTR.H
//
//   POS Printer header file for OPOS Applications.
//
// Modification history
// ------------------------------------------------------------------
//
/////////////////////////////////////////////////////////////////////

#if !defined(EPSNPTR_H)
#define      EPSNPTR_H

#include "epson.h"

/////////////////////////////////////////////////////////////////////
// DirectIO Method Constants
/////////////////////////////////////////////////////////////////////

/////////////////////////////////////////////////
// Command
 
// Output Data Command
const LONG PTR_DI_OUTPUT_NORMAL		= 100;
const LONG PTR_DI_OUTPUT_REALTIME	= 101;
// Bitmap Command
const LONG PTR_DI_SET_BITMAP_MODE	= 110;
const LONG PTR_DI_PRINT_FLASH_BITMAP= 111;
const LONG PTR_DI_PRINT_FLASH_BITMAP2=112;
const LONG PTR_DI_DELETE_NVIMAGE		= 116;
// Select Slip or Validation 
const LONG PTR_DI_SELECT_SLIP		= 120;
const LONG PTR_DI_SLIP_CHANGE_SIDE	= 121;
// Maintenance Counter
const LONG PTR_DI_RESET_MAINTENANCE_COUNTER	= 130;
const LONG PTR_DI_GET_MAINTENANCE_COUNTER	= 131;
// International character set
const LONG PTR_DI_SET_INTERNATIONAL_CHAR	= 140;
// Wait for output
const LONG PTR_DI_WAIT_FOR_OUTPUT	= 150;
// Panel switch
const LONG PTR_DI_PANEL_SWITCH	= 160;
// GetSupportFunction
const long PTR_DI_GET_SUPPORT_FUNCTION = 170;
// Select page mode
const long PTR_DI_SELECT_PAGE_MODE = 180;

// The Label Printer Command
const LONG PTR_DI_LABEL_REMOVE			= 200;
const LONG PTR_DI_LABEL_SET_PRINT_MODE	= 201;
const LONG PTR_DI_LABEL_SET_COUNT_MODE	= 202;
const LONG PTR_DI_LABEL_PRINT_COUNT		= 203;
const LONG PTR_DI_LABEL_SET_COUNT_VALUE	= 204;
// Recover error
const LONG PTR_DI_RECOVER_ERROR		= 300;
// Hardware reset
const LONG PTR_DI_HARDWARE_RESET	= 301;
// Announciator
const LONG PTR_DI_ANC_BUZZER		= 400;
const LONG PTR_DI_ANC_LED_GREEN		= 401;
const LONG PTR_DI_ANC_LED_RED		= 402;

const LONG PTR_DI_DELAYED_CUT		= 500;
const LONG PTR_DI_CUT_AND_FEED_TOF	= 501;

const LONG PTR_DI_DRAWLINE			= 650;
const LONG PTR_DI_DRAWRECTANGLE		= 651;

const LONG PTR_DI_SET_PAPERLAYOUT	= 700;
const LONG PTR_DI_GET_PAPERLAYOUT	= 701;

const LONG PTR_DI_OPERATION_MODE	= 750;

// Code128
const LONG PTR_DI_CODE128_TYPE		= 800;

// Slip DoubleStrike
const long PTR_DI_SLIP_EMPHASIS 	= 900;

// Ring Buzzer
const long PTR_DI_RING_BUZZER 		= 1000;			// for TM-P60
const long PTR_DI_RING_BUZZER_WITH_TIME = 1001;		// for UB-E02A/UB-R02A use
// GetBatteryStatus
const long PTR_DI_GET_BATTERY_STATUS 	= 1100;

// Select fontpage
const long PTR_DI_SELECT_FONTPAGE	= 1200;

// Unite image and barcode image
const long PTR_DI_UNITE_DATA_MODE 	= 1300;

// SpecialFontMode
const long PTR_DI_SPECIAL_FONT_MODE = 1400;

// SoundMelody
const long PTR_DI_SOUND_MELODY = 1500;

// Set Bitmap Printing Type
const long PTR_DI_SET_BITMAP_PRINTING_TYPE = 1600;

// Set Slip Rotate Font Type
const long PTR_DI_SET_SLIP_ROTATE_FONT_TYPE = 1700;

// Print Franking
const long PTR_DI_PRINT_FRANKING = 1800;

// Offline Condition
const long PTR_DI_GET_OFFLINE_CONDITION = 1900;

// Select Slip Paper Type
const long PTR_DI_SELECT_SLIP_PAPER_TYPE = 2000;

/////////////////////////////////////////////////
// pData

// Dummy
const LONG PTR_DI_DUMMY			= 0;
// Output Mode
const LONG PTR_DI_ROTATE		= 1;
const LONG PTR_DI_TRANSACTION	= 2;
// Bitmap Mode
const LONG PTR_DI_BMP_NORMAL	= 0;
const LONG PTR_DI_BMP_DOWNLOAD	= 1;
const LONG PTR_DI_BMP_LUSTER	= 2;
// Delete NV Image
const LONG PTR_DI_DELETE_ALL	= -1;
// Select Slip or Validation 
const LONG PTR_DI_SLIP_FULLSLIP		= 0;
const LONG PTR_DI_SLIP_VALIDATION	= 1;
// Select the printing side 
const LONG PTR_DI_SLIP_FRONT_SIDE = 0;
const LONG PTR_DI_SLIP_REVERSE_SIDE = 1;
// GetSupportFunction
const long PTR_DI_VALIDATION	= 0x01;
const long PTR_DI_EMPHASIS		= 0x02;
// SelectPageMode
const long PTR_DI_NORMAL_DOT_PAGE_MODE	= 0;
const long PTR_DI_HALF_DOT_PAGE_MODE	= 1;
// Label Print Mode
const LONG PTR_DI_LABEL_RIGHT_SPACE	= 0;
const LONG PTR_DI_LABEL_RIGHT_ZERO	= 1;
const LONG PTR_DI_LABEL_LEFT_SPACE	= 2;
// International character set
const LONG PTR_DI_CHAR_USA		= 0;
const LONG PTR_DI_CHAR_FRANCE	= 1;
const LONG PTR_DI_CHAR_GERMANY	= 2;
const LONG PTR_DI_CHAR_UK		= 3;
const LONG PTR_DI_CHAR_DENMARK1	= 4;
const LONG PTR_DI_CHAR_SWEDEN	= 5;
const LONG PTR_DI_CHAR_ITALY	= 6;
const LONG PTR_DI_CHAR_SPAIN1	= 7;
const LONG PTR_DI_CHAR_JAPAN	= 8;
const LONG PTR_DI_CHAR_NORWAY	= 9;
const LONG PTR_DI_CHAR_DENMARK2	= 10;
const LONG PTR_DI_CHAR_SPAIN2	= 11;
const LONG PTR_DI_CHAR_LATIN_AMERICA	= 12;
const LONG PTR_DI_CHAR_KOREA	= 13;
const LONG PTR_DI_CHAR_SLOVENIA	= 14;
const LONG PTR_DI_CHAR_CROATIA	= 14;
const LONG PTR_DI_CHAR_CHINA	= 15;
const LONG PTR_DI_CHAR_VIETNAM	= 16;
const LONG PTR_DI_CHAR_ARABIA	= 17;
// Code128 default code
const LONG PTR_DI_CODE_A		= 0;
const LONG PTR_DI_CODE_B		= 1;
const LONG PTR_DI_CODE_C		= 2;
// SlipEmphasis
const long PTR_DI_DISABLE_EMPHASIS	= 0;
const long PTR_DI_ENABLE_EMPHASIS	= 1;
// GetBatteryStatus
const long PTR_DI_POWERED_BY_AC			= 0x0100;
const long PTR_DI_POWERED_BY_BATTERY	= 0x0200;
const long PTR_DI_BATTERY_NEAR_MIDDLE	= 0x0080;
const long PTR_DI_BATTERY_NEAR_LOW		= 0x0040;
const long PTR_DI_BATTERY_LOW			= 0x0020;
const long PTR_DI_BATTERY_FULL			= 0x0010;
const long PTR_DI_BATTERY_MIDDLE		= 0x0008;
const long PTR_DI_BATTERY_NEAR_EMPTY	= 0x0004;
const long PTR_DI_BATTERY_CLOSE_EMPTY	= 0x0002;
const long PTR_DI_BATTERY_REMOVED		= 0x0001;
// Select fontpage
const long PTR_DI_THAICODE42	= 20;
const long PTR_DI_THAICODE11	= 21;
const long PTR_DI_THAICODE13	= 22;
const long PTR_DI_THAICODE14	= 23;
const long PTR_DI_THAICODE16	= 24;
const long PTR_DI_THAICODE17	= 25;
const long PTR_DI_THAICODE18	= 26;
const long PTR_DI_TCVN3_PAGE1	= 30;
const long PTR_DI_TCVN3_PAGE2	= 31;
// Line Thickness
const long PTR_DI_LINE_THIN		= 1;
const long PTR_DI_LINE_NORMAL	= 2;
const long PTR_DI_LINE_THICK	= 3;
// Operation Mode
const long PTR_DI_SERIAL_MODE = 0;
const long PTR_DI_PEEL_OFF_MODE	= 1;

// Unite data mode
const long PTR_DI_UNITE_EXIT				= 0x0000;

const long PTR_DI_UNITE_TRANSPARENT 		= 0x0001;
const long PTR_DI_UNITE_OPAQUE				= 0x0002;

const long PTR_DI_UNITE_UPPER_ALIGNMENT	 	= 0x0100;
const long PTR_DI_UNITE_MIDDLE_ALIGNMENT 	= 0x0200;
const long PTR_DI_UNITE_LOWER_ALIGNMENT 	= 0x0400;

// SpecialFontMode
const long PTR_DI_FONT_NORMAL  = 0;
const long PTR_DI_FONT_SPECIAL = 1;

// Bitmap Printing Type
const long PTR_DI_BITMAP_PRINTING_NORMAL = 0;
const long PTR_DI_BITMAP_PRINTING_MULTI_TONE = 1;

// Sound Melody Pattern
const long PTR_DI_SOUND_PATTERN_1 = 1;
const long PTR_DI_SOUND_PATTERN_2 = 2;
const long PTR_DI_SOUND_PATTERN_3 = 3;
const long PTR_DI_SOUND_PATTERN_4 = 4;
const long PTR_DI_SOUND_PATTERN_5 = 5;
const long PTR_DI_SOUND_PATTERN_ERROR = 100;
const long PTR_DI_SOUND_PATTERN_NOPAPER = 101;

// Slip Rotate Font Type
const long PTR_DI_ROTATE_FONT_A = 0;
const long PTR_DI_ROTATE_FONT_B = 1;

// Offline Condition
const long PTR_DI_CONDITION_ONLINE					= 0;
const long PTR_DI_CONDITION_RECEIPT_ONLY_OFFLINE	= 1;
const long PTR_DI_CONDITION_SLIP_ONLY_OFFLINE		= 2;
const long PTR_DI_CONDITION_OFFLINE_EXECUTE			= 3;
const long PTR_DI_CONDITION_RECOVERBLE				= 4;
const long PTR_DI_CONDITION_UNRECOVERBLE			= 5;

// Select Slip Paper Type
const long PTR_DI_SLIP_PAPER_NORMAL	= 1;
const long PTR_DI_SLIP_PAPER_COPY	= 2;

/////////////////////////////////////////////////////////////////////
// "ResultCodeExtended" Property Constants for Printer
/////////////////////////////////////////////////////////////////////
const LONG OPOS_EPTR_BADSTATION	= 1 + PTRERREXT;	// invalid station
const LONG OPOS_EPTR_NOSTATION	= 2 + PTRERREXT;	// station not present

const LONG OPOS_EPTR_UNRECOVERABLE	= 3 + PTRERREXT;
const LONG OPOS_EPTR_CUTTER 		= 4 + PTRERREXT;
const LONG OPOS_EPTR_MECHANICAL		= 5 + PTRERREXT;
const LONG OPOS_EPTR_OVERHEAT		= 6 + PTRERREXT;	// This constant is provided only for compatibility.
const LONG OPOS_EPTR_AUTORECOVERABLE= 6 + PTRERREXT;
const LONG OPOS_EPTR_ROTATE90		= 7 + PTRERREXT;
const LONG OPOS_EPTR_LABEL_REMOVAL	= 8 + PTRERREXT;
const LONG OPOS_EPTR_BUTTON_OPERATION	= 9 + PTRERREXT;
const LONG OPOS_EPTR_LABEL_JAM			= 10 + PTRERREXT; 
const LONG OPOS_EPTR_REMOVE_BUTTON		= 11 + PTRERREXT;

/////////////////////////////////////////////////////////////////////
// "StatusUpdateEvent" Event: "Data" Parameter Constants
/////////////////////////////////////////////////////////////////////

// Following constants are provided only for compatibility.
const LONG PTR_SUE_BLACK_INK_EMPTY		= 7 + 2000;
const LONG PTR_SUE_BLACK_INK_NEAREMPTY	= 8 + 2000;
const LONG PTR_SUE_BLACK_INK_OK			= 9 + 2000;
const LONG PTR_SUE_BLACK_INK_CARTRIDGE_REMOVED	= 10 + 2000;
const LONG PTR_SUE_BLACK_INK_CARTRIDGE_OK		= 11 + 2000;
const LONG PTR_SUE_BLACK_HEAD_BEGIN_CLEANING	= 12 + 2000;
const LONG PTR_SUE_BLACK_HEAD_END_CLEANING		= 13 + 2000;

// Battery status
const LONG PTR_SUE_POWERED_BY_AC		= 1 + 100000;
const LONG PTR_SUE_POWERED_BY_BATTERY	= 2 + 100000;
const LONG PTR_SUE_BATTERY_FULL			= 3 + 100000;
const LONG PTR_SUE_BATTERY_MIDDLE		= 4 + 100000;
const LONG PTR_SUE_BATTERY_NEAR_EMPTY	= 5 + 100000;
const LONG PTR_SUE_BATTERY_CLOSE_EMPTY	= 6 + 100000;
const LONG PTR_SUE_BATTERY_OK			= 7 + 100000;
const LONG PTR_SUE_BATTERY_REMOVED		= 8 + 100000;
const LONG PTR_SUE_BATTERY_NEAR_MIDDLE	= 9 + 100000;
const LONG PTR_SUE_BATTERY_NEAR_LOW		= 10 + 100000;
const LONG PTR_SUE_BATTERY_LOW			= 11 + 100000;

/////////////////////////////////////////////////////////////////////
// "DirectIOEvent" Event: "Data" Parameter Constants
/////////////////////////////////////////////////////////////////////
const LONG PTR_DIE_SET_BITMAP_MODE	= 110;
const LONG PTR_DIE_LABEL_REMOVAL	= 111;
const LONG PTR_DIE_LABEL_REMOVE_OK	= 112;
const LONG PTR_DIE_BUTTON_OPERATION	= 113;
const LONG PTR_DIE_LABEL_JAM		= 114;
const LONG PTR_DIE_BUTTON_OK		= 115;	

/////////////////////////////////////////////////
// pData

// PTR_DIE_SET_BITMAP_MODE
const LONG PTR_DIE_MEMORY	= 1;
const LONG PTR_DIE_VRAM		= 2;
const LONG PTR_DIE_NVRAM	= 3;

#endif                  // !defined(EPSNPTR_H)

