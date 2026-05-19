VERSION 5.00
Object = "{CCB90100-B81E-11D2-AB74-0040054C3719}#1.0#0"; "OPOSLineDisplay.ocx"
Begin VB.Form Step9 
   BorderStyle     =   1  'Fixed Single
   Caption         =   "Step 9 Display bitmaps."
   ClientHeight    =   3690
   ClientLeft      =   3045
   ClientTop       =   3330
   ClientWidth     =   5895
   LinkTopic       =   "MDIForm1"
   MaxButton       =   0   'False
   MinButton       =   0   'False
   ScaleHeight     =   3690
   ScaleWidth      =   5895
   Begin VB.Frame Frame2 
      Caption         =   "GraphicDisplay only"
      Height          =   1485
      Left            =   2835
      TabIndex        =   9
      Top             =   1785
      Width           =   2640
      Begin VB.CommandButton Command8 
         Caption         =   "Display Bitmap"
         Height          =   450
         Left            =   210
         TabIndex        =   11
         Top             =   840
         Width           =   2250
      End
      Begin VB.CommandButton Command7 
         Caption         =   "Set Character Ornaments"
         Height          =   450
         Left            =   210
         TabIndex        =   10
         Top             =   315
         Width           =   2250
      End
   End
   Begin VB.CommandButton Command6 
      Caption         =   "Windows Control"
      Height          =   450
      Left            =   315
      TabIndex        =   8
      Top             =   2835
      Width           =   2250
   End
   Begin VB.Frame Frame1 
      Caption         =   "scroll"
      Height          =   960
      Left            =   2835
      TabIndex        =   5
      Top             =   630
      Width           =   2640
      Begin VB.CommandButton Command5 
         Caption         =   "Right"
         Height          =   450
         Index           =   1
         Left            =   1365
         TabIndex        =   7
         Top             =   315
         Width           =   990
      End
      Begin VB.CommandButton Command5 
         Caption         =   "Left"
         Height          =   450
         Index           =   0
         Left            =   210
         TabIndex        =   6
         Top             =   315
         Width           =   990
      End
   End
   Begin VB.CommandButton Command4 
      Caption         =   "Teletype Characters"
      Height          =   450
      Left            =   315
      TabIndex        =   4
      Top             =   2205
      Width           =   2250
   End
   Begin VB.CommandButton Command3 
      Caption         =   "Blink Characters"
      Height          =   450
      Left            =   315
      TabIndex        =   3
      Top             =   1575
      Width           =   2250
   End
   Begin VB.CommandButton Command1 
      Caption         =   "Clear"
      Height          =   450
      Left            =   315
      TabIndex        =   2
      Top             =   315
      Width           =   2250
   End
   Begin VB.CommandButton Command2 
      Caption         =   "Specify Position"
      Height          =   450
      Left            =   315
      TabIndex        =   1
      Top             =   945
      Width           =   2250
   End
   Begin VB.CommandButton cmdExit 
      Caption         =   "Close"
      Height          =   345
      Left            =   4725
      TabIndex        =   0
      Top             =   105
      Width           =   990
   End
   Begin OposLineDisplay_CCOCtl.OPOSLineDisplay OPOSLineDisplay1 
      Left            =   3960
      OleObjectBlob   =   "sDisplay9.frx":0000
      Top             =   120
   End
End
Attribute VB_Name = "Step9"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = False
'Step 9 Display bitmaps.
Option Explicit

Private Sub cmdExit_Click()

    Unload Me

End Sub

'Clear the text on the window
'
Private Sub Command1_Click()

    OPOSLineDisplay1.ClearText

End Sub

'Display the text as specified.
'
Private Sub Command2_Click()

    OPOSLineDisplay1.DisplayTextAt 1, 5, "Hello OPOS.", DISP_DT_NORMAL

End Sub


'Display the blinking text
'
Private Sub Command3_Click()

    OPOSLineDisplay1.DisplayText "Blink", DISP_DT_BLINK

End Sub

'Teletype display
'
Private Sub Command4_Click()

    OPOSLineDisplay1.InterCharacterWait = 1000
    OPOSLineDisplay1.DisplayText "Teletype", DISP_DT_NORMAL

End Sub

Private Sub Command4_LostFocus()

    OPOSLineDisplay1.InterCharacterWait = 0

End Sub

'Scrolled display
'
Private Sub Command5_Click(Index As Integer)

    If Index = 0 Then
        ' Move one character to the left side
        OPOSLineDisplay1.ScrollText DISP_ST_LEFT, 1
    Else
        ' Move two characters to the right side
        OPOSLineDisplay1.ScrollText DISP_ST_RIGHT, 2
    End If

End Sub


'Window control
'
Private Sub Command6_Click()

    With OPOSLineDisplay1
        .CreateWindow 1, 10, 1, 10, 1, 34
        .MarqueeFormat = DISP_MF_WALK
        .MarqueeType = DISP_MT_INIT
        .MarqueeRepeatWait = 1000
        .MarqueeUnitWait = 100
        .DisplayText "Sale! 50%-20% OFF!", DISP_DT_NORMAL
        .MarqueeType = DISP_MT_LEFT
        
        MsgBox "When pressing OK, it ends"
        
        .MarqueeType = DISP_MT_INIT
        .DestroyWindow
    End With

End Sub

'Display various characters
'
Private Sub Command7_Click()

    Dim ESC As String * 1

    ESC = Chr(&H1B)
    With OPOSLineDisplay1
        .ClearText
        .DisplayTextAt 0, 0, "Normal " + ESC + "|bCBold", DISP_DT_NORMAL
        .DisplayTextAt 1, 0, ESC + "|rvCReverse" + ESC + "|bCBold&Reverse", DISP_DT_NORMAL
        .DisplayText Chr(&H1B) + "|bC Bold", DISP_DT_NORMAL
    End With

End Sub

'Display a bitmap
'
Private Sub Command8_Click()

    Dim ESC As String * 1
    Dim pData As Long
    Dim pString As String

    ESC = Chr(&H1B)
    With OPOSLineDisplay1
        pData = 1
        pString = App.Path + "\Logo.bmp"
        .DirectIO DISP_DI_SETIMAGE, pData, pString
        pData = DISP_DI_DUMMY
        pString = ""
        .DirectIO DISP_DI_GRAPHIC, pData, pString
        .CreateWindow 0, 0, 64, 256, 64, 256
        .DisplayText ESC + "|1B", DISP_DT_NORMAL
        
        MsgBox "When pressing Ok button, delete the window."
        
        .DestroyWindow
    End With

End Sub

Private Sub Form_Load()

    With OPOSLineDisplay1
        .Open "Unit1"
        If .ResultCode <> OPOS_SUCCESS Then
            MsgBox "This device has not been registered, or cannot use."
            GoTo LoadError
        End If
        
        .ClaimDevice 1000
        If .ResultCode <> OPOS_SUCCESS Then
            MsgBox "Fails to get the exclusive right for the device."
            GoTo LoadError
        End If
        
        If .CapPowerReporting <> OPOS_PR_NONE Then
            .PowerNotify = OPOS_PN_ENABLED
        End If
        
        .DeviceEnabled = True
        If .ResultCode <> OPOS_SUCCESS Then
            MsgBox "Now the device is disable to use."
            GoTo LoadError
        End If
    
        'Supports only for the Graphic Display(EPSON DM-D500 series)
        If Left(.DeviceName, 5) <> "DM-D5" Then
            Frame2.Enabled = False      'Frame
            Command7.Enabled = False    'Various characters
            Command8.Enabled = False    'Disable the bitmap
        End If
    End With

    Exit Sub

LoadError:
    Dim OBJ As Object
    For Each OBJ In Me
        If OBJ.Name <> "OPOSLineDisplay1" Then
            OBJ.Enabled = False
        End If
    Next
    cmdExit.Enabled = True              'Only the exit button is enabled.

End Sub

Private Sub Form_Unload(Cancel As Integer)

    With OPOSLineDisplay1
        .ClearText
        .DeviceEnabled = False
        .ReleaseDevice
        .Close
    End With

End Sub

Private Sub OPOSLineDisplay1_StatusUpdateEvent(ByVal Data As Long)

'The Power Reporting Requirements fires the event when the device power status is changed.
    Select Case Data
    Case OPOS_SUE_POWER_ONLINE          ' The device is powered on.
        MsgBox "The device is powered on."
    Case OPOS_SUE_POWER_OFF             ' The device is powered off, or unconnected.
        MsgBox "The device is powered off, or unconnected."
    Case OPOS_SUE_POWER_OFFLINE         ' The device is powered on, but disable to operate.
        MsgBox "The device is powered on, but disable to operate.."
    Case OPOS_SUE_POWER_OFF_OFFLINE     ' The device is powered off or off-line.
        MsgBox "The device is powered off or off-line."
    End Select

End Sub


