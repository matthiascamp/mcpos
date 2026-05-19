VERSION 5.00
Object = "{CCB90120-B81E-11D2-AB74-0040054C3719}#1.0#0"; "OPOSMSR.ocx"
Begin VB.Form Step1 
   BorderStyle     =   1  'Fixed Single
   Caption         =   "Step 1 Normal operation: Display the read data."
   ClientHeight    =   3795
   ClientLeft      =   3045
   ClientTop       =   3330
   ClientWidth     =   6210
   LinkTopic       =   "MDIForm1"
   MaxButton       =   0   'False
   MinButton       =   0   'False
   ScaleHeight     =   3795
   ScaleWidth      =   6210
   Begin VB.CommandButton cmdExit 
      Caption         =   "Close"
      Height          =   345
      Left            =   4830
      TabIndex        =   18
      Top             =   105
      Width           =   1200
   End
   Begin VB.TextBox Text9 
      Height          =   270
      Left            =   1575
      TabIndex        =   16
      Top             =   3150
      Width           =   4425
   End
   Begin VB.TextBox Text8 
      Height          =   270
      Left            =   1575
      TabIndex        =   14
      Top             =   2835
      Width           =   4425
   End
   Begin VB.TextBox Text7 
      Height          =   270
      Left            =   1575
      TabIndex        =   12
      Top             =   2520
      Width           =   4425
   End
   Begin VB.TextBox Text6 
      Height          =   270
      Left            =   1575
      TabIndex        =   5
      Top             =   2205
      Width           =   4425
   End
   Begin VB.TextBox Text5 
      Height          =   270
      Left            =   1575
      TabIndex        =   4
      Top             =   1890
      Width           =   2850
   End
   Begin VB.TextBox Text4 
      Height          =   270
      Left            =   1575
      TabIndex        =   3
      Top             =   1575
      Width           =   2850
   End
   Begin VB.TextBox Text3 
      Height          =   270
      Left            =   1575
      TabIndex        =   2
      Top             =   1260
      Width           =   2850
   End
   Begin VB.TextBox Text2 
      Height          =   270
      Left            =   1575
      TabIndex        =   1
      Top             =   945
      Width           =   2850
   End
   Begin VB.TextBox Text1 
      Height          =   270
      Left            =   1575
      TabIndex        =   0
      Top             =   630
      Width           =   2850
   End
   Begin OposMSR_CCOCtl.OPOSMSR OPOSMSR1 
      Left            =   5040
      OleObjectBlob   =   "sMSR1.frx":0000
      Top             =   720
   End
   Begin VB.Label Label10 
      Caption         =   "Please swipe a card."
      Height          =   225
      Left            =   210
      TabIndex        =   19
      Top             =   210
      Width           =   3375
   End
   Begin VB.Label Label9 
      Alignment       =   1  'Right Justify
      Caption         =   "Track4"
      Height          =   225
      Left            =   105
      TabIndex        =   17
      Top             =   3150
      Width           =   1380
   End
   Begin VB.Label Label8 
      Alignment       =   1  'Right Justify
      Caption         =   "Track3"
      Height          =   225
      Left            =   105
      TabIndex        =   15
      Top             =   2835
      Width           =   1380
   End
   Begin VB.Label Label7 
      Alignment       =   1  'Right Justify
      Caption         =   "Track2"
      Height          =   225
      Left            =   105
      TabIndex        =   13
      Top             =   2520
      Width           =   1380
   End
   Begin VB.Label Label6 
      Alignment       =   1  'Right Justify
      Caption         =   "Track1"
      Height          =   225
      Left            =   105
      TabIndex        =   11
      Top             =   2205
      Width           =   1380
   End
   Begin VB.Label Label5 
      Alignment       =   1  'Right Justify
      Caption         =   "Middle initials"
      Height          =   225
      Left            =   105
      TabIndex        =   10
      Top             =   1890
      Width           =   1380
   End
   Begin VB.Label Label4 
      Alignment       =   1  'Right Justify
      Caption         =   "Surname"
      Height          =   225
      Left            =   105
      TabIndex        =   9
      Top             =   1575
      Width           =   1380
   End
   Begin VB.Label Label3 
      Alignment       =   1  'Right Justify
      Caption         =   "First Name"
      Height          =   225
      Left            =   105
      TabIndex        =   8
      Top             =   1260
      Width           =   1380
   End
   Begin VB.Label Label2 
      Alignment       =   1  'Right Justify
      Caption         =   "Expiration date"
      Height          =   225
      Left            =   105
      TabIndex        =   7
      Top             =   945
      Width           =   1380
   End
   Begin VB.Label Label1 
      Alignment       =   1  'Right Justify
      Caption         =   "Account number"
      Height          =   225
      Left            =   105
      TabIndex        =   6
      Top             =   630
      Width           =   1380
   End
End
Attribute VB_Name = "Step1"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = False
'Step 1 Normal operation: Display the read data.
Option Explicit

Private Sub cmdExit_Click()

    Unload Me

End Sub

Private Sub Form_Load()

    With OPOSMSR1
        'Open the device
        'Use a Logical Device Name which has been set on the SetupPOS.
        .Open "Unit1"
        
        'Get the exclusive control right for the opened device.
        'Then the device is disable from other application.
        
        '(Notice:When using an old CO, use the Claim.)
        .ClaimDevice 1000
        
        'Enable the device.
        .DeviceEnabled = True
        
        'Enable the event.
        .DataEventEnabled = True
        
        'Stores the read data to the each property.
        .ParseDecodeData = True
    End With

End Sub

Private Sub Form_Unload(Cancel As Integer)

    With OPOSMSR1
        'Cancel the device
        .DeviceEnabled = False
        
        'Release the device exclusive control right.
        '(Notice:When using an old CO, use the Release.)
        .ReleaseDevice
        
        'Finish using the device.
        .Close
    End With

End Sub

Private Sub OPOSMSR1_DataEvent(ByVal Status As Long)

    With OPOSMSR1
        Text1.Text = .AccountNumber     '(Account No.)
        Text2.Text = .ExpirationDate    '(Valid date)
        Text3.Text = .FirstName         '(First Name)
        Text4.Text = .Surname           '(Family Name)
        Text5.Text = .MiddleInitial     '(Middle Initial)
        Text6.Text = .Track1Data
        Text7.Text = .Track2Data
        Text8.Text = .Track3Data
        Text9.Text = .Track4Data
        
        .DataEventEnabled = True
    End With

End Sub

