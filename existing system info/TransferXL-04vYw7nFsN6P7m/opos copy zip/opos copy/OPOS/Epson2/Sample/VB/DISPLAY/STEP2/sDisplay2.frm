VERSION 5.00
Object = "{CCB90100-B81E-11D2-AB74-0040054C3719}#1.0#0"; "OPOSLineDisplay.ocx"
Begin VB.Form Step2 
   BorderStyle     =   1  'Fixed Single
   Caption         =   "Step 2 A display and acquisition of the character to the specified position."
   ClientHeight    =   2295
   ClientLeft      =   3045
   ClientTop       =   3330
   ClientWidth     =   8145
   LinkTopic       =   "MDIForm1"
   MaxButton       =   0   'False
   MinButton       =   0   'False
   ScaleHeight     =   2295
   ScaleWidth      =   8145
   Begin VB.TextBox Text1 
      Height          =   450
      Left            =   4200
      TabIndex        =   4
      Top             =   1560
      Width           =   915
   End
   Begin VB.CommandButton Command3 
      Caption         =   "Specify Position and acquisition"
      Height          =   450
      Left            =   915
      TabIndex        =   3
      Top             =   1560
      Width           =   2940
   End
   Begin VB.CommandButton Command1 
      Caption         =   "Clear"
      Height          =   450
      Left            =   915
      TabIndex        =   2
      Top             =   315
      Width           =   2940
   End
   Begin VB.CommandButton cmdExit 
      Caption         =   "Close"
      Height          =   345
      Left            =   6120
      TabIndex        =   1
      Top             =   360
      Width           =   990
   End
   Begin VB.CommandButton Command2 
      Caption         =   "Specify Position and Display"
      Height          =   450
      Left            =   915
      TabIndex        =   0
      Top             =   945
      Width           =   2940
   End
   Begin OposLineDisplay_CCOCtl.OPOSLineDisplay OPOSLineDisplay1 
      Left            =   6240
      OleObjectBlob   =   "sDisplay2.frx":0000
      Top             =   1080
   End
   Begin VB.Label Label1 
      Caption         =   "(Hex)"
      Height          =   255
      Left            =   5160
      TabIndex        =   5
      Top             =   1755
      Width           =   495
   End
End
Attribute VB_Name = "Step2"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = False
'Step 2 Display characters at the specified position.
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

'Display the text as specified.
    OPOSLineDisplay1.DisplayTextAt 1, 5, "Hello OPOS.", DISP_DT_NORMAL

'As follows, there are ways of displaying after setting the property.
'    OPOSLineDisplay1.CursorRow = 0
'    OPOSLineDisplay1.CursorColumn = 10
'    OPOSLineDisplay1.DisplayText "Hello OPOS.", DISP_DT_NORMAL

End Sub

'Acquired the character of cursor position
'
Private Sub Command3_Click()
    Dim temp As Long
    
    'The present cursor position is set up.
    OPOSLineDisplay1.CursorRow = 1
    OPOSLineDisplay1.CursorColumn = 5
    
    'The character of the present cursor position is acquired.
    OPOSLineDisplay1.ReadCharacterAtCursor temp
    Text1.Text = Hex(temp) 'hexadecimal digit
    
End Sub

Private Sub Form_Load()

    With OPOSLineDisplay1
        .Open "Unit1"
        .ClaimDevice 1000
        If .CapPowerReporting <> OPOS_PR_NONE Then
            .PowerNotify = OPOS_PN_ENABLED
        End If
        .DeviceEnabled = True
    End With

End Sub

Private Sub Form_Unload(Cancel As Integer)

    With OPOSLineDisplay1
        .DeviceEnabled = False
        .ReleaseDevice
        .Close
    End With

End Sub

